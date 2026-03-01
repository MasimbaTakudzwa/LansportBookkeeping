import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cacheGet, cacheSet } from "@/lib/redis";

export const dynamic = "force-dynamic"; // never cache at HTTP layer

const CACHE_KEY = "dashboard:summary";
const CACHE_TTL = 300; // 5 minutes

export async function GET() {
  try {
    // ── Redis cache ───────────────────────────────────────────────────────────
    const cached = await cacheGet(CACHE_KEY);
    if (cached) return NextResponse.json(JSON.parse(cached));

    // Check if any data has been loaded
    const entryCount = await db.journalEntry.count();
    if (entryCount === 0) {
      return NextResponse.json({ hasData: false });
    }

    // ── Core KPIs ─────────────────────────────────────────────────────────────
    const [kpis] = await db.$queryRawUnsafe<
      {
        total_revenue: string;
        total_expenses: string;
        net_income: string;
        cash_position: string;
        operating_margin: string;
        occupied_units: string;
      }[]
    >(`
      WITH
        rev AS (
          SELECT COALESCE(ROUND(SUM(je.credit), 2), 0) AS total
          FROM journal_entries je
          JOIN accounts a ON je.account_id = a.id
          WHERE a.type = 'REVENUE'
        ),
        exp AS (
          SELECT COALESCE(ROUND(SUM(je.debit), 2), 0) AS total
          FROM journal_entries je
          JOIN accounts a ON je.account_id = a.id
          WHERE a.type = 'EXPENSE'
        ),
        cash AS (
          SELECT COALESCE(ROUND(SUM(je.debit) - SUM(je.credit), 2), 0) AS balance
          FROM journal_entries je
          JOIN accounts a ON je.account_id = a.id
          WHERE a.account_number = '1000'
        ),
        occupied AS (
          SELECT COUNT(DISTINCT je.account_id) AS cnt
          FROM journal_entries je
          JOIN accounts a ON je.account_id = a.id
          WHERE a.account_number BETWEEN '4010' AND '4026'
            AND je.credit > 0
        )
      SELECT
        r.total                                                         AS total_revenue,
        e.total                                                         AS total_expenses,
        ROUND(r.total - e.total, 2)                                     AS net_income,
        c.balance                                                       AS cash_position,
        CASE
          WHEN r.total > 0 THEN ROUND((r.total - e.total) / r.total * 100, 1)
          ELSE 0
        END                                                             AS operating_margin,
        o.cnt::TEXT                                                     AS occupied_units
      FROM rev r, exp e, cash c, occupied o
    `);

    // ── Metadata ──────────────────────────────────────────────────────────────
    const [meta] = await db.$queryRawUnsafe<
      { entry_count: string; last_upload: Date | null }[]
    >(`
      SELECT
        COUNT(*)::TEXT                                                  AS entry_count,
        (SELECT MAX(uploaded_at)
           FROM upload_history
          WHERE status = 'complete')                                    AS last_upload
      FROM journal_entries
    `);

    const result = {
      hasData:        true,
      totalRevenue:   parseFloat(kpis.total_revenue),
      totalExpenses:  parseFloat(kpis.total_expenses),
      netIncome:      parseFloat(kpis.net_income),
      cashPosition:   parseFloat(kpis.cash_position),
      operatingMargin: parseFloat(kpis.operating_margin),
      occupiedUnits:  parseInt(kpis.occupied_units, 10),
      totalUnits:     17,
      entryCount:     parseInt(meta.entry_count, 10),
      lastUploadDate: meta.last_upload?.toISOString() ?? null,
    };

    await cacheSet(CACHE_KEY, JSON.stringify(result), CACHE_TTL);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Dashboard summary error:", error);
    return NextResponse.json(
      { error: "Failed to load dashboard data" },
      { status: 500 }
    );
  }
}
