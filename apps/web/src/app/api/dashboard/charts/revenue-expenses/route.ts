import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

interface Row {
  period: string;
  revenue: string;
  expenses: string;
}

export async function GET() {
  try {
    const count = await db.journalEntry.count();
    if (count === 0) return NextResponse.json([]);

    const rows = await db.$queryRawUnsafe<Row[]>(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', je.date), 'Mon YYYY') AS period,
        COALESCE(ROUND(SUM(CASE WHEN a.type = 'REVENUE' THEN je.credit ELSE 0 END), 2), 0) AS revenue,
        COALESCE(ROUND(SUM(CASE WHEN a.type = 'EXPENSE' THEN je.debit  ELSE 0 END), 2), 0) AS expenses
      FROM journal_entries je
      JOIN accounts a ON je.account_id = a.id
      GROUP BY DATE_TRUNC('month', je.date)
      ORDER BY DATE_TRUNC('month', je.date)
    `);

    return NextResponse.json(
      rows.map((r) => ({
        period:   r.period,
        revenue:  parseFloat(r.revenue),
        expenses: parseFloat(r.expenses),
      }))
    );
  } catch (error) {
    console.error("Revenue-expenses chart error:", error);
    return NextResponse.json({ error: "Failed to load chart data" }, { status: 500 });
  }
}
