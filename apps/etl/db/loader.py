"""
Database Loader for Lansport Analytics ETL
===========================================
Loads parsed workbook data into PostgreSQL using SQLAlchemy.

Pipeline:
  1. Check upload_history — skip if checksum already exists (deduplication)
  2. Create upload_history record with status "processing"
  3. Upsert all accounts from Chart of Accounts
  4. Build account_number → id lookup map
  5. Batch-insert all journal entries
  6. Seed / update properties table (17 rental units)
  7. Run data integrity checks (Trial Balance reconciliation)
  8. Update upload_history status to "complete" (or "error" on failure)
"""

import logging
import os
from datetime import datetime
from decimal import Decimal

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

from parsers.excel_parser import WorkbookData
from db.property_seeder import seed_properties
from db.period_aggregator import compute_period_summaries

logger = logging.getLogger(__name__)

# Batch size for bulk journal entry inserts
_BATCH_SIZE = 200


class DataLoader:
    """Loads parsed workbook data into PostgreSQL."""

    def __init__(self):
        database_url = os.getenv("DATABASE_URL")
        if not database_url:
            raise RuntimeError("DATABASE_URL environment variable is not set")
        self.engine = create_engine(database_url, pool_pre_ping=True)

    # ─────────────────────────────────────────────────────────────────────
    # Public entry point
    # ─────────────────────────────────────────────────────────────────────

    def load(self, data: WorkbookData, checksum: str, filename: str) -> None:
        """Load all workbook data. Idempotent — re-uploading the same file is a no-op."""

        if not data.accounts:
            raise ValueError("Workbook contains no accounts — aborting load")
        if not data.journal_entries:
            raise ValueError("Workbook contains no journal entries — aborting load")

        with Session(self.engine) as session:
            # ── Deduplication check ──────────────────────────────────────
            existing = session.execute(
                text("SELECT id, status FROM upload_history WHERE checksum = :cs"),
                {"cs": checksum},
            ).fetchone()

            if existing:
                logger.info(
                    f"Skipping duplicate upload (checksum {checksum[:8]}…, "
                    f"previous id={existing[0]}, status={existing[1]})"
                )
                return

            # ── Create upload_history record ─────────────────────────────
            upload_id: int = session.execute(
                text("""
                    INSERT INTO upload_history
                        (filename, checksum, uploaded_at, row_count, status)
                    VALUES
                        (:filename, :checksum, :now, :row_count, 'processing')
                    RETURNING id
                """),
                {
                    "filename":  filename,
                    "checksum":  checksum,
                    "now":       datetime.utcnow(),
                    "row_count": len(data.journal_entries),
                },
            ).scalar_one()
            session.commit()
            logger.info(f"Upload record created: id={upload_id}")

            try:
                # ── Load data ────────────────────────────────────────────
                self._upsert_accounts(session, data)
                account_map = self._build_account_map(session)
                self._insert_journal_entries(session, data, upload_id, account_map)
                seed_properties(session)
                compute_period_summaries(session)
                session.commit()

                # ── Data integrity check ──────────────────────────────────
                self._check_trial_balance(session)

                # ── Mark complete ─────────────────────────────────────────
                session.execute(
                    text("""
                        UPDATE upload_history
                        SET status = 'complete'
                        WHERE id = :id
                    """),
                    {"id": upload_id},
                )
                session.commit()
                logger.info(
                    f"ETL complete — upload_id={upload_id}, "
                    f"accounts={len(data.accounts)}, "
                    f"entries={len(data.journal_entries)}"
                )

            except Exception as exc:
                session.rollback()
                logger.error(f"ETL failed for upload_id={upload_id}: {exc}", exc_info=True)
                # Record the error in a fresh transaction
                with Session(self.engine) as err_session:
                    err_session.execute(
                        text("""
                            UPDATE upload_history
                            SET status = 'error', error_message = :msg
                            WHERE id = :id
                        """),
                        {"id": upload_id, "msg": str(exc)[:500]},
                    )
                    err_session.commit()
                raise

    # ─────────────────────────────────────────────────────────────────────
    # Private helpers
    # ─────────────────────────────────────────────────────────────────────

    def _upsert_accounts(self, session: Session, data: WorkbookData) -> None:
        """Insert or update all accounts from the Chart of Accounts."""
        for acct in data.accounts:
            session.execute(
                text("""
                    INSERT INTO accounts
                        (account_number, name, type, normal_balance, created_at)
                    VALUES
                        (:acct_no, :name, CAST(:type AS "AccountType"), :nb, NOW())
                    ON CONFLICT (account_number) DO UPDATE SET
                        name          = EXCLUDED.name,
                        type          = EXCLUDED.type,
                        normal_balance = EXCLUDED.normal_balance
                """),
                {
                    "acct_no": acct.account_number,
                    "name":    acct.name,
                    "type":    acct.type,
                    "nb":      acct.normal_balance,
                },
            )
        session.flush()
        logger.info(f"Accounts upserted: {len(data.accounts)}")

    def _build_account_map(self, session: Session) -> dict[str, int]:
        """Return {account_number: id} for all accounts in the database."""
        rows = session.execute(
            text("SELECT account_number, id FROM accounts")
        ).fetchall()
        return {row[0]: row[1] for row in rows}

    def _insert_journal_entries(
        self,
        session: Session,
        data: WorkbookData,
        upload_id: int,
        account_map: dict[str, int],
    ) -> None:
        """Batch-insert all journal entries, linking each to its account id."""
        skipped = 0
        batch: list[dict] = []

        for entry in data.journal_entries:
            acct_id = account_map.get(entry.account_number)
            if acct_id is None:
                logger.warning(
                    f"Account {entry.account_number!r} not in accounts table — "
                    f"skipping entry dated {entry.date.date()}"
                )
                skipped += 1
                continue

            batch.append({
                "date":        entry.date,
                "account_id":  acct_id,
                "description": entry.description,
                "debit":       str(entry.debit),
                "credit":      str(entry.credit),
                "upload_id":   upload_id,
            })

            if len(batch) >= _BATCH_SIZE:
                self._flush_entry_batch(session, batch)
                batch = []

        if batch:
            self._flush_entry_batch(session, batch)

        loaded = len(data.journal_entries) - skipped
        logger.info(f"Journal entries inserted: {loaded} (skipped: {skipped})")

    @staticmethod
    def _flush_entry_batch(session: Session, batch: list[dict]) -> None:
        session.execute(
            text("""
                INSERT INTO journal_entries
                    (date, account_id, description, debit, credit, upload_id, created_at)
                VALUES
                    (:date, :account_id, :description, :debit, :credit, :upload_id, NOW())
            """),
            batch,
        )
        session.flush()

    @staticmethod
    def _check_trial_balance(session: Session) -> None:
        """Verify that total debits equal total credits. Logs a warning on mismatch."""
        row = session.execute(
            text("""
                SELECT
                    ROUND(SUM(debit),  2) AS total_debits,
                    ROUND(SUM(credit), 2) AS total_credits
                FROM journal_entries
            """)
        ).fetchone()

        if row is None:
            return

        debits  = float(row[0] or 0)
        credits = float(row[1] or 0)
        diff    = abs(debits - credits)

        if diff > 0.01:
            logger.warning(
                f"Trial Balance mismatch: debits={debits:,.2f}, "
                f"credits={credits:,.2f}, diff={diff:.2f}"
            )
        else:
            logger.info(
                f"Trial Balance OK — debits={debits:,.2f}, credits={credits:,.2f}"
            )
