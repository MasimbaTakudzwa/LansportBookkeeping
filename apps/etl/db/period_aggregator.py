"""
Period Aggregator for Lansport Analytics ETL
=============================================
Computes monthly aggregates from journal_entries and stores them in
period_summaries for fast time-series dashboard queries.

Called after journal entries are loaded. Fully idempotent — safe to re-run.

Period convention:
  period_start = first day of month at 00:00:00 UTC
  period_end   = first day of next month at 00:00:00 UTC  (exclusive end)

  Queries should use: WHERE date >= period_start AND date < period_end
"""

import logging
from sqlalchemy.orm import Session
from sqlalchemy import text

logger = logging.getLogger(__name__)


def compute_period_summaries(session: Session) -> int:
    """
    Recompute all monthly period summaries from scratch.
    Deletes existing summaries, then inserts fresh aggregations.

    Returns the number of period-account rows inserted.
    """
    # Full recompute — clear stale summaries first
    deleted = session.execute(text("DELETE FROM period_summaries")).rowcount
    if deleted:
        logger.info(f"Cleared {deleted} existing period summary rows")

    result = session.execute(
        text("""
            INSERT INTO period_summaries
                (period_start, period_end, account_id, total_debit, total_credit, net)
            SELECT
                DATE_TRUNC('month', je.date)                              AS period_start,
                DATE_TRUNC('month', je.date) + INTERVAL '1 month'        AS period_end,
                je.account_id,
                ROUND(SUM(je.debit),  2)                                  AS total_debit,
                ROUND(SUM(je.credit), 2)                                  AS total_credit,
                ROUND(SUM(je.credit) - SUM(je.debit), 2)                 AS net
            FROM journal_entries je
            GROUP BY DATE_TRUNC('month', je.date), je.account_id
            ON CONFLICT (period_start, period_end, account_id) DO UPDATE SET
                total_debit  = EXCLUDED.total_debit,
                total_credit = EXCLUDED.total_credit,
                net          = EXCLUDED.net
            RETURNING id
        """)
    )
    count = len(result.fetchall())
    logger.info(f"Period summaries computed: {count} rows (account × month)")
    return count
