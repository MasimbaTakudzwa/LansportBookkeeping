"""
Parser tests for the Lansport Analytics ETL service.

These tests run against the actual workbook file. They are skipped
if the workbook is not present (e.g. in a clean CI environment without data).

Verified facts about the current workbook (Bookkeeping Lansport Main (1).xlsx):
  - 92 accounts in Chart of Accounts
  - 84 journal entries with real data (Jan 2026)
  - Dates range 2026-01-01 to 2026-01-07
  - Trial Balance: debits == credits == 26295.20
"""

import sys
from decimal import Decimal
from datetime import datetime
from pathlib import Path

import pytest

# Allow running from apps/etl/ or from the repo root
sys.path.insert(0, str(Path(__file__).parent.parent))

from parsers.excel_parser import ExcelParser, ACCOUNT_TYPE_MAP

WORKBOOK_PATH = (
    Path(__file__).parent.parent.parent.parent
    / "Bookkeeping Lansport Main (1).xlsx"
)

skip_if_no_workbook = pytest.mark.skipif(
    not WORKBOOK_PATH.exists(),
    reason=f"Workbook not found at {WORKBOOK_PATH}",
)


# ─────────────────────────────────────────────────────────────────────────────
# Chart of Accounts
# ─────────────────────────────────────────────────────────────────────────────

@skip_if_no_workbook
def test_account_count():
    data = ExcelParser(str(WORKBOOK_PATH)).parse()
    assert len(data.accounts) == 92, (
        f"Expected 92 accounts, got {len(data.accounts)}"
    )


@skip_if_no_workbook
def test_known_accounts():
    data = ExcelParser(str(WORKBOOK_PATH)).parse()
    acct_map = {a.account_number: a for a in data.accounts}

    # Cash (1000) — Asset, debit normal
    cash = acct_map.get("1000")
    assert cash is not None, "Account 1000 (Cash) not found"
    assert cash.name == "Cash"
    assert cash.type == "ASSET"
    assert cash.normal_balance == "DEBIT"

    # Owner's Capital (3000) — Equity, credit normal
    capital = acct_map.get("3000")
    assert capital is not None, "Account 3000 (Owner's Capital) not found"
    assert capital.type == "EQUITY"
    assert capital.normal_balance == "CREDIT"

    # Accumulated Depreciation (1510) — Contra Asset
    acc_dep = acct_map.get("1510")
    assert acc_dep is not None, "Account 1510 (Accumulated Depreciation) not found"
    assert acc_dep.type == "CONTRA_ASSET"
    assert acc_dep.normal_balance == "CREDIT"

    # Unit 31 revenue (4020) — highest yielding unit
    rent_31 = acct_map.get("4020")
    assert rent_31 is not None, "Account 4020 (Rent Unit 31) not found"
    assert rent_31.type == "REVENUE"

    # R&M for Unit 31 (5310) — Expense
    rm_31 = acct_map.get("5310")
    assert rm_31 is not None, "Account 5310 (R&M Unit 31) not found"
    assert rm_31.type == "EXPENSE"


@skip_if_no_workbook
def test_all_six_account_types_present():
    data = ExcelParser(str(WORKBOOK_PATH)).parse()
    types_found = {a.type for a in data.accounts}
    expected = {"ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE", "CONTRA_ASSET"}
    assert types_found == expected, (
        f"Expected types {expected}, got {types_found}"
    )


# ─────────────────────────────────────────────────────────────────────────────
# General Ledger
# ─────────────────────────────────────────────────────────────────────────────

@skip_if_no_workbook
def test_entry_count():
    data = ExcelParser(str(WORKBOOK_PATH)).parse()
    assert len(data.journal_entries) == 84, (
        f"Expected 84 journal entries, got {len(data.journal_entries)}"
    )


@skip_if_no_workbook
def test_date_range():
    data = ExcelParser(str(WORKBOOK_PATH)).parse()
    dates = [e.date for e in data.journal_entries]
    assert min(dates) == datetime(2026, 1, 1), f"Unexpected first date: {min(dates)}"
    assert max(dates) == datetime(2026, 1, 7), f"Unexpected last date: {max(dates)}"


@skip_if_no_workbook
def test_first_entry():
    """First entry: owner invests $10,000 cash on 2026-01-01."""
    data = ExcelParser(str(WORKBOOK_PATH)).parse()
    first = data.journal_entries[0]
    assert first.date == datetime(2026, 1, 1)
    assert first.account_number == "1000"
    assert first.debit == Decimal("10000.00")
    assert first.credit == Decimal("0.00")


@skip_if_no_workbook
def test_trial_balance():
    """Total debits must equal total credits (double-entry accounting)."""
    data = ExcelParser(str(WORKBOOK_PATH)).parse()
    total_debits  = sum(e.debit  for e in data.journal_entries)
    total_credits = sum(e.credit for e in data.journal_entries)
    assert abs(float(total_debits) - float(total_credits)) <= 0.01, (
        f"Trial balance mismatch: debits={total_debits}, credits={total_credits}"
    )
    # Verify the known total
    assert float(total_debits) == pytest.approx(26295.20, abs=0.01), (
        f"Expected total debits ~26295.20, got {total_debits}"
    )


@skip_if_no_workbook
def test_all_entry_accounts_in_chart():
    """Every account number in the GL must exist in the Chart of Accounts."""
    data = ExcelParser(str(WORKBOOK_PATH)).parse()
    chart_numbers = {a.account_number for a in data.accounts}
    gl_numbers    = {e.account_number for e in data.journal_entries}
    orphans = gl_numbers - chart_numbers
    assert not orphans, (
        f"GL entries reference accounts not in Chart of Accounts: {orphans}"
    )


# ─────────────────────────────────────────────────────────────────────────────
# Account type map unit tests (no workbook needed)
# ─────────────────────────────────────────────────────────────────────────────

def test_account_type_map_covers_all_workbook_types():
    """All account type strings from the workbook must be in the map."""
    workbook_types = ["asset", "liability", "equity", "revenue", "expense", "contra asset"]
    for t in workbook_types:
        assert t in ACCOUNT_TYPE_MAP, f"'{t}' not found in ACCOUNT_TYPE_MAP"


def test_account_type_map_values():
    assert ACCOUNT_TYPE_MAP["asset"]        == "ASSET"
    assert ACCOUNT_TYPE_MAP["liability"]    == "LIABILITY"
    assert ACCOUNT_TYPE_MAP["equity"]       == "EQUITY"
    assert ACCOUNT_TYPE_MAP["revenue"]      == "REVENUE"
    assert ACCOUNT_TYPE_MAP["expense"]      == "EXPENSE"
    assert ACCOUNT_TYPE_MAP["contra asset"] == "CONTRA_ASSET"
