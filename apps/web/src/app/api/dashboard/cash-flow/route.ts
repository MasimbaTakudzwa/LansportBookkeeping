import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

interface Row {
  date: string;
  description: string;
  debit: string;
  credit: string;
}

export async function GET() {
  try {
    const count = await db.journalEntry.count();
    if (count === 0) return NextResponse.json([]);

    const rows = await db.$queryRawUnsafe<Row[]>(`
      SELECT
        TO_CHAR(je.date, 'YYYY-MM-DD') AS date,
        je.description,
        COALESCE(ROUND(je.debit,  2), 0) AS debit,
        COALESCE(ROUND(je.credit, 2), 0) AS credit
      FROM journal_entries je
      JOIN accounts a ON je.account_id = a.id
      WHERE a.account_number = '1000'
      ORDER BY je.date, je.id
    `);

    // Build running balance
    let running = 0;
    const result = rows.map((r) => {
      const inflow  = parseFloat(r.debit);
      const outflow = parseFloat(r.credit);
      running = Math.round((running + inflow - outflow) * 100) / 100;
      return {
        date:        r.date,
        description: r.description,
        inflow,
        outflow,
        balance: running,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Cash-flow API error:", error);
    return NextResponse.json({ error: "Failed to load cash flow data" }, { status: 500 });
  }
}
