import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const entryCount = await db.journalEntry.count();

    if (entryCount === 0) {
      return NextResponse.json({ hasData: false });
    }

    // ── Trial Balance: total debits must equal total credits ─────────────
    const [tb] = await db.$queryRawUnsafe<
      { total_debits: string; total_credits: string }[]
    >(`
      SELECT
        ROUND(SUM(debit),  2)::TEXT AS total_debits,
        ROUND(SUM(credit), 2)::TEXT AS total_credits
      FROM journal_entries
    `);

    const totalDebits  = parseFloat(tb.total_debits);
    const totalCredits = parseFloat(tb.total_credits);
    const trialBalanced = Math.abs(totalDebits - totalCredits) <= 0.01;

    // ── Balance Sheet: Assets = Liabilities + Equity ─────────────────────
    const [bs] = await db.$queryRawUnsafe<
      { total_assets: string; total_liabilities: string; total_equity: string }[]
    >(`
      SELECT
        -- Assets: debit-normal → positive balance = debit - credit
        -- Contra assets (e.g. Accumulated Depreciation): debit-credit is negative → reduces assets
        ROUND(
          SUM(CASE
            WHEN a.type IN ('ASSET', 'CONTRA_ASSET') THEN je.debit - je.credit
            ELSE 0
          END), 2
        )::TEXT AS total_assets,

        -- Liabilities: credit-normal → balance = credit - debit
        ROUND(
          SUM(CASE
            WHEN a.type = 'LIABILITY' THEN je.credit - je.debit
            ELSE 0
          END), 2
        )::TEXT AS total_liabilities,

        -- Equity: credit-normal for capital, debit-normal for draws
        ROUND(
          SUM(CASE
            WHEN a.type = 'EQUITY' AND a.normal_balance = 'CREDIT' THEN je.credit - je.debit
            WHEN a.type = 'EQUITY' AND a.normal_balance = 'DEBIT'  THEN je.debit  - je.credit
            ELSE 0
          END), 2
        )::TEXT AS total_equity
      FROM journal_entries je
      JOIN accounts a ON je.account_id = a.id
    `);

    const totalAssets      = parseFloat(bs.total_assets);
    const totalLiabilities = parseFloat(bs.total_liabilities);
    const totalEquity      = parseFloat(bs.total_equity);
    const bsBalanced = Math.abs(totalAssets - (totalLiabilities + totalEquity)) <= 0.01;

    // ── Account & entry counts ────────────────────────────────────────────
    const accountCount = await db.account.count();

    return NextResponse.json({
      hasData: true,
      trialBalance: {
        totalDebits,
        totalCredits,
        balanced: trialBalanced,
      },
      balanceSheet: {
        totalAssets,
        totalLiabilities,
        totalEquity,
        balanced: bsBalanced,
      },
      counts: {
        accounts: accountCount,
        entries:  entryCount,
      },
    });
  } catch (error) {
    console.error("Integrity check error:", error);
    return NextResponse.json(
      { error: "Failed to run integrity checks" },
      { status: 500 }
    );
  }
}
