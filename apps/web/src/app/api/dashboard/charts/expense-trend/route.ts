import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

interface Row {
  period: string;
  expenses: string;
}

export async function GET() {
  try {
    const count = await db.journalEntry.count();
    if (count === 0) return NextResponse.json([]);

    const rows = await db.$queryRawUnsafe<Row[]>(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', je.date), 'Mon YYYY') AS period,
        COALESCE(ROUND(SUM(je.debit), 2), 0)              AS expenses
      FROM journal_entries je
      JOIN accounts a ON je.account_id = a.id
      WHERE a.type = 'EXPENSE'
      GROUP BY DATE_TRUNC('month', je.date)
      ORDER BY DATE_TRUNC('month', je.date)
    `);

    const series = rows.map((r, i) => {
      const expenses = parseFloat(r.expenses);
      const prev     = i > 0 ? parseFloat(rows[i - 1].expenses) : null;
      const change   =
        prev !== null && prev > 0
          ? Math.round(((expenses - prev) / prev) * 1000) / 10
          : null;
      return { period: r.period, expenses, change };
    });

    return NextResponse.json(series);
  } catch (error) {
    console.error("Expense-trend chart error:", error);
    return NextResponse.json({ error: "Failed to load chart data" }, { status: 500 });
  }
}
