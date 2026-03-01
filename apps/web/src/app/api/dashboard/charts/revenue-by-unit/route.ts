import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

interface Row {
  unit: string;
  group_name: string;
  display_order: number;
  revenue: string;
}

export async function GET() {
  try {
    const count = await db.journalEntry.count();
    if (count === 0) return NextResponse.json([]);

    // All 17 units from properties table, LEFT JOIN so zero-revenue units appear
    const rows = await db.$queryRawUnsafe<Row[]>(`
      SELECT
        p.name                                                AS unit,
        p.group                                               AS group_name,
        p.display_order,
        COALESCE(ROUND(SUM(je.credit), 2), 0)                AS revenue
      FROM properties p
      LEFT JOIN accounts a    ON a.id  = p.revenue_account_id
      LEFT JOIN journal_entries je ON je.account_id = a.id
      GROUP BY p.id, p.name, p.group, p.display_order
      ORDER BY revenue DESC, p.display_order
    `);

    const total = rows.reduce((s, r) => s + parseFloat(r.revenue), 0);

    return NextResponse.json(
      rows.map((r) => {
        const revenue = parseFloat(r.revenue);
        return {
          unit:    r.unit,
          group:   r.group_name,
          revenue,
          pct: total > 0 ? Math.round((revenue / total) * 1000) / 10 : 0,
        };
      })
    );
  } catch (error) {
    console.error("Revenue-by-unit chart error:", error);
    return NextResponse.json({ error: "Failed to load chart data" }, { status: 500 });
  }
}
