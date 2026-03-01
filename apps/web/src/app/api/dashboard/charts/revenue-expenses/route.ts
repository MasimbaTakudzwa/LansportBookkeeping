import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

interface Row {
  period: string;
  revenue: string;
  expenses: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: Request) {
  try {
    const count = await db.journalEntry.count();
    if (count === 0) return NextResponse.json([]);

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from") ?? "";
    const to   = searchParams.get("to")   ?? "";

    const conditions: string[] = [];
    const binds: string[] = [];
    let idx = 1;

    if (from && DATE_RE.test(from)) {
      conditions.push(`je.date >= $${idx}::date`);
      binds.push(from); idx++;
    }
    if (to && DATE_RE.test(to)) {
      conditions.push(`je.date < ($${idx}::date + INTERVAL '1 month')`);
      binds.push(to); idx++;
    }

    const where = conditions.length > 0 ? `AND ${conditions.join(" AND ")}` : "";

    const rows = await db.$queryRawUnsafe<Row[]>(
      `SELECT
         TO_CHAR(DATE_TRUNC('month', je.date), 'Mon YYYY') AS period,
         COALESCE(ROUND(SUM(CASE WHEN a.type = 'REVENUE' THEN je.credit ELSE 0 END), 2), 0) AS revenue,
         COALESCE(ROUND(SUM(CASE WHEN a.type = 'EXPENSE' THEN je.debit  ELSE 0 END), 2), 0) AS expenses
       FROM journal_entries je
       JOIN accounts a ON je.account_id = a.id
       WHERE 1=1 ${where}
       GROUP BY DATE_TRUNC('month', je.date)
       ORDER BY DATE_TRUNC('month', je.date)`,
      ...binds
    );

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
