import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

interface Row {
  name: string;
  value: string;
}

export async function GET() {
  try {
    const count = await db.journalEntry.count();
    if (count === 0) return NextResponse.json([]);

    const rows = await db.$queryRawUnsafe<Row[]>(`
      SELECT
        a.name                                AS name,
        ROUND(COALESCE(SUM(je.debit), 0), 2) AS value
      FROM journal_entries je
      JOIN accounts a ON je.account_id = a.id
      WHERE a.type = 'EXPENSE'
      GROUP BY a.id, a.name
      HAVING SUM(je.debit) > 0
      ORDER BY SUM(je.debit) DESC
    `);

    return NextResponse.json(
      rows.map((r) => ({ name: r.name, value: parseFloat(r.value) }))
    );
  } catch (error) {
    console.error("Expenses-breakdown chart error:", error);
    return NextResponse.json({ error: "Failed to load chart data" }, { status: 500 });
  }
}
