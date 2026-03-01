import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

interface KpiRow {
  total_revenue:      string;
  total_expenses:     string;
  net_income:         string;
  total_assets:       string;
  total_liabilities:  string;
  total_equity:       string;
  current_assets:     string;
  current_liabilities: string;
  cash_position:      string;
}

export async function GET() {
  try {
    const count = await db.journalEntry.count();
    if (count === 0) return NextResponse.json({ hasData: false });

    const [row] = await db.$queryRawUnsafe<KpiRow[]>(`
      WITH
        -- Income statement figures
        rev AS (
          SELECT COALESCE(SUM(je.credit), 0) AS total
          FROM journal_entries je JOIN accounts a ON je.account_id = a.id
          WHERE a.type = 'REVENUE'
        ),
        exp AS (
          SELECT COALESCE(SUM(je.debit), 0) AS total
          FROM journal_entries je JOIN accounts a ON je.account_id = a.id
          WHERE a.type = 'EXPENSE'
        ),
        -- Balance sheet: Assets (debit-heavy) + Contra Assets (credit-heavy)
        assets AS (
          SELECT
            COALESCE(SUM(CASE WHEN a.type = 'ASSET'        THEN je.debit  - je.credit ELSE 0 END), 0)
          + COALESCE(SUM(CASE WHEN a.type = 'CONTRA_ASSET' THEN je.credit - je.debit  ELSE 0 END), 0)
            AS total
          FROM journal_entries je JOIN accounts a ON je.account_id = a.id
        ),
        liabilities AS (
          SELECT COALESCE(SUM(je.credit - je.debit), 0) AS total
          FROM journal_entries je JOIN accounts a ON je.account_id = a.id
          WHERE a.type = 'LIABILITY'
        ),
        equity AS (
          SELECT COALESCE(SUM(
            CASE WHEN a.normal_balance = 'CREDIT' THEN je.credit - je.debit
                 ELSE je.debit - je.credit END
          ), 0) AS total
          FROM journal_entries je JOIN accounts a ON je.account_id = a.id
          WHERE a.type = 'EQUITY'
        ),
        -- Current Assets: account numbers 1000-1999 (current asset range)
        curr_assets AS (
          SELECT COALESCE(SUM(je.debit - je.credit), 0) AS total
          FROM journal_entries je JOIN accounts a ON je.account_id = a.id
          WHERE a.type = 'ASSET' AND a.account_number < '2000'
        ),
        -- Current Liabilities: account numbers 2000-2999
        curr_liab AS (
          SELECT COALESCE(SUM(je.credit - je.debit), 0) AS total
          FROM journal_entries je JOIN accounts a ON je.account_id = a.id
          WHERE a.type = 'LIABILITY' AND a.account_number < '3000'
        ),
        cash AS (
          SELECT COALESCE(SUM(je.debit - je.credit), 0) AS balance
          FROM journal_entries je JOIN accounts a ON je.account_id = a.id
          WHERE a.account_number = '1000'
        )
      SELECT
        ROUND(r.total, 2)::TEXT           AS total_revenue,
        ROUND(e.total, 2)::TEXT           AS total_expenses,
        ROUND(r.total - e.total, 2)::TEXT AS net_income,
        ROUND(a.total, 2)::TEXT           AS total_assets,
        ROUND(l.total, 2)::TEXT           AS total_liabilities,
        ROUND(q.total, 2)::TEXT           AS total_equity,
        ROUND(ca.total, 2)::TEXT          AS current_assets,
        ROUND(cl.total, 2)::TEXT          AS current_liabilities,
        ROUND(c.balance, 2)::TEXT         AS cash_position
      FROM rev r, exp e, assets a, liabilities l, equity q, curr_assets ca, curr_liab cl, cash c
    `);

    const revenue    = parseFloat(row.total_revenue);
    const expenses   = parseFloat(row.total_expenses);
    const netIncome  = parseFloat(row.net_income);
    const assets     = parseFloat(row.total_assets);
    const liab       = parseFloat(row.total_liabilities);
    const equity     = parseFloat(row.total_equity);
    const currAssets = parseFloat(row.current_assets);
    const currLiab   = parseFloat(row.current_liabilities);
    const cash       = parseFloat(row.cash_position);

    const safe = (n: number, d: number) => (d !== 0 ? Math.round((n / d) * 1000) / 10 : null);

    return NextResponse.json({
      hasData: true,
      income: {
        totalRevenue:    revenue,
        totalExpenses:   expenses,
        netIncome,
        grossMargin:     safe(revenue - expenses, revenue),      // % of revenue
        operatingMargin: safe(revenue - expenses, revenue),
        expenseRatio:    safe(expenses, revenue),
      },
      balanceSheet: {
        totalAssets:     assets,
        totalLiabilities: liab,
        totalEquity:     equity,
        cashPosition:    cash,
      },
      ratios: {
        // Profitability
        netProfitMargin:  safe(netIncome, revenue),
        returnOnEquity:   equity > 0 ? safe(netIncome, equity) : null,
        returnOnAssets:   assets > 0 ? safe(netIncome, assets) : null,
        // Liquidity
        currentRatio:     currLiab > 0 ? Math.round((currAssets / currLiab) * 100) / 100 : null,
        quickRatio:       currLiab > 0 ? Math.round(((currAssets - cash) / currLiab) * 100) / 100 : null,
        cashRatio:        currLiab > 0 ? Math.round((cash / currLiab) * 100) / 100 : null,
        // Leverage
        debtToEquity:     equity > 0 ? Math.round((liab / equity) * 100) / 100 : null,
        debtRatio:        assets > 0 ? Math.round((liab / assets) * 100) / 100 : null,
      },
    });
  } catch (error) {
    console.error("Ratios API error:", error);
    return NextResponse.json({ error: "Failed to compute ratios" }, { status: 500 });
  }
}
