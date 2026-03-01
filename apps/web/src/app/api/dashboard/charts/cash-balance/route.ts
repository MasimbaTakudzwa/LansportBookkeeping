import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

interface Row {
  date: string;
  debit: string;
  credit: string;
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
         TO_CHAR(je.date, 'YYYY-MM-DD') AS date,
         COALESCE(ROUND(SUM(je.debit),  2), 0) AS debit,
         COALESCE(ROUND(SUM(je.credit), 2), 0) AS credit
       FROM journal_entries je
       JOIN accounts a ON je.account_id = a.id
       WHERE a.account_number = '1000' ${where}
       GROUP BY je.date
       ORDER BY je.date`,
      ...binds
    );

    let running = 0;
    const series = rows.map((r) => {
      running += parseFloat(r.debit) - parseFloat(r.credit);
      return {
        date:    r.date,
        balance: Math.round(running * 100) / 100,
      };
    });

    return NextResponse.json(series);
  } catch (error) {
    console.error("Cash-balance chart error:", error);
    return NextResponse.json({ error: "Failed to load chart data" }, { status: 500 });
  }
}
