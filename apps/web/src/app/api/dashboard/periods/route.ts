import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

interface Row {
  period_val: string; // YYYY-MM-01
  period_label: string; // "Jan 2026"
}

/** Returns the distinct calendar months that have journal entry data. */
export async function GET() {
  try {
    const count = await db.journalEntry.count();
    if (count === 0) return NextResponse.json([]);

    const rows = await db.$queryRawUnsafe<Row[]>(`
      SELECT DISTINCT
        TO_CHAR(DATE_TRUNC('month', date), 'YYYY-MM-01') AS period_val,
        TO_CHAR(DATE_TRUNC('month', date), 'Mon YYYY')   AS period_label
      FROM journal_entries
      ORDER BY period_val
    `);

    return NextResponse.json(rows.map((r) => ({ value: r.period_val, label: r.period_label })));
  } catch (error) {
    console.error("Periods API error:", error);
    return NextResponse.json({ error: "Failed to load periods" }, { status: 500 });
  }
}
