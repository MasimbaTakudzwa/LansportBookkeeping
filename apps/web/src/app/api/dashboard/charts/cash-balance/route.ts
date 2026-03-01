import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

interface Row {
  date: string;
  debit: string;
  credit: string;
}

export async function GET() {
  try {
    const count = await db.journalEntry.count();
    if (count === 0) return NextResponse.json([]);

    // Fetch daily net movements in account 1000 (Cash), then compute running balance
    const rows = await db.$queryRawUnsafe<Row[]>(`
      SELECT
        TO_CHAR(je.date, 'YYYY-MM-DD') AS date,
        COALESCE(ROUND(SUM(je.debit),  2), 0) AS debit,
        COALESCE(ROUND(SUM(je.credit), 2), 0) AS credit
      FROM journal_entries je
      JOIN accounts a ON je.account_id = a.id
      WHERE a.account_number = '1000'
      GROUP BY je.date
      ORDER BY je.date
    `);

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
