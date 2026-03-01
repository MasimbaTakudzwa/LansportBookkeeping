import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

interface Row {
  name: string;
  group_name: string;
  display_order: number;
  revenue: string;
  rm: string;
  levy: string;
}

export async function GET() {
  try {
    const count = await db.journalEntry.count();
    if (count === 0) return NextResponse.json([]);

    const rows = await db.$queryRawUnsafe<Row[]>(`
      SELECT
        p.name                                                                AS name,
        p.group                                                               AS group_name,
        p.display_order,
        COALESCE(ROUND(SUM(CASE WHEN a_rev.account_number IS NOT NULL THEN je_rev.credit ELSE 0 END), 2), 0) AS revenue,
        COALESCE(ROUND(SUM(CASE WHEN a_rm.account_number  IS NOT NULL THEN je_rm.debit   ELSE 0 END), 2), 0) AS rm,
        COALESCE(ROUND(SUM(CASE WHEN a_lv.account_number  IS NOT NULL THEN je_lv.debit   ELSE 0 END), 2), 0) AS levy
      FROM properties p
      -- Revenue entries
      LEFT JOIN accounts a_rev ON a_rev.id = p.revenue_account_id
      LEFT JOIN journal_entries je_rev ON je_rev.account_id = a_rev.id
      -- R&M entries
      LEFT JOIN accounts a_rm ON a_rm.id = p.rm_account_id
      LEFT JOIN journal_entries je_rm ON je_rm.account_id = a_rm.id
      -- Levy entries
      LEFT JOIN accounts a_lv ON a_lv.id = p.levy_account_id
      LEFT JOIN journal_entries je_lv ON je_lv.account_id = a_lv.id
      GROUP BY p.id, p.name, p.group, p.display_order
      ORDER BY p.display_order
    `);

    const data = rows.map((r) => {
      const revenue = parseFloat(r.revenue);
      const rm      = parseFloat(r.rm);
      const levy    = parseFloat(r.levy);
      const net     = Math.round((revenue - rm - levy) * 100) / 100;
      const margin  = revenue > 0 ? Math.round((net / revenue) * 1000) / 10 : null;
      return {
        name:    r.name,
        group:   r.group_name,
        revenue,
        rm,
        levy,
        net,
        margin,
      };
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Per-unit API error:", error);
    return NextResponse.json({ error: "Failed to load per-unit data" }, { status: 500 });
  }
}
