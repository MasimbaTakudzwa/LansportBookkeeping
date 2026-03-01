import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildCsv, csvHeaders, today } from "@/lib/csv";

export const dynamic = "force-dynamic";

interface Row {
  name: string;
  group_name: string;
  revenue: string;
  rm: string;
  levy: string;
}

export async function GET() {
  try {
    const count = await db.journalEntry.count();
    if (count === 0) {
      return new NextResponse("No data available.", { status: 404 });
    }

    const rows = await db.$queryRawUnsafe<Row[]>(`
      SELECT
        p.name                                                                AS name,
        p.group                                                               AS group_name,
        COALESCE(ROUND(SUM(CASE WHEN a_rev.id IS NOT NULL THEN je_rev.credit ELSE 0 END), 2), 0) AS revenue,
        COALESCE(ROUND(SUM(CASE WHEN a_rm.id  IS NOT NULL THEN je_rm.debit   ELSE 0 END), 2), 0) AS rm,
        COALESCE(ROUND(SUM(CASE WHEN a_lv.id  IS NOT NULL THEN je_lv.debit   ELSE 0 END), 2), 0) AS levy
      FROM properties p
      LEFT JOIN accounts a_rev ON a_rev.id = p.revenue_account_id
      LEFT JOIN journal_entries je_rev ON je_rev.account_id = a_rev.id
      LEFT JOIN accounts a_rm  ON a_rm.id  = p.rm_account_id
      LEFT JOIN journal_entries je_rm  ON je_rm.account_id  = a_rm.id
      LEFT JOIN accounts a_lv  ON a_lv.id  = p.levy_account_id
      LEFT JOIN journal_entries je_lv  ON je_lv.account_id  = a_lv.id
      GROUP BY p.id, p.name, p.group, p.display_order
      ORDER BY p.display_order
    `);

    const headers = ["Unit", "Group", "Revenue (ZAR)", "R&M (ZAR)", "Levy (ZAR)", "Net (ZAR)", "Margin (%)"];
    const csvRows = rows.map((r) => {
      const revenue = parseFloat(r.revenue);
      const rm      = parseFloat(r.rm);
      const levy    = parseFloat(r.levy);
      const net     = Math.round((revenue - rm - levy) * 100) / 100;
      const margin  = revenue > 0 ? Math.round((net / revenue) * 1000) / 10 : "";
      return [r.name, r.group_name, revenue, rm, levy, net, margin];
    });

    const csv = buildCsv(headers, csvRows);
    return new NextResponse(csv, { headers: csvHeaders(`per-unit-${today()}.csv`) });
  } catch (error) {
    console.error("Export per-unit error:", error);
    return new NextResponse("Export failed.", { status: 500 });
  }
}
