import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

interface Row {
  period: string;
  revenue: string;
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
         COALESCE(ROUND(SUM(je.credit), 2), 0)             AS revenue
       FROM journal_entries je
       JOIN accounts a ON je.account_id = a.id
       WHERE a.type = 'REVENUE' ${where}
       GROUP BY DATE_TRUNC('month', je.date)
       ORDER BY DATE_TRUNC('month', je.date)`,
      ...binds
    );

    const series = rows.map((r, i) => {
      const revenue = parseFloat(r.revenue);
      const prev    = i > 0 ? parseFloat(rows[i - 1].revenue) : null;
      const change  =
        prev !== null && prev > 0
          ? Math.round(((revenue - prev) / prev) * 1000) / 10
          : null;
      return { period: r.period, revenue, change };
    });

    return NextResponse.json(series);
  } catch (error) {
    console.error("Revenue-trend chart error:", error);
    return NextResponse.json({ error: "Failed to load chart data" }, { status: 500 });
  }
}
