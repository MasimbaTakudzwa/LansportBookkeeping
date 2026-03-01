"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Upload, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { AnalyticsSkeleton } from "@/components/skeletons";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { RevenueTrendChart }   from "@/components/charts/revenue-trend-chart";
import { RevenueByUnitChart }  from "@/components/charts/revenue-by-unit-chart";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface TrendPoint {
  period: string;
  revenue: number;
  change: number | null;
}

interface UnitPoint {
  unit: string;
  group: string;
  revenue: number;
  pct: number;
}

type SortKey = "unit" | "revenue" | "pct";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function ChangeChip({ change }: { change: number | null }) {
  if (change === null)
    return <span className="text-muted-foreground text-xs">—</span>;
  if (change > 0)
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-green-600">
        <TrendingUp className="h-3 w-3" />+{change}%
      </span>
    );
  if (change < 0)
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-destructive">
        <TrendingDown className="h-3 w-3" />{change}%
      </span>
    );
  return (
    <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
      <Minus className="h-3 w-3" />0%
    </span>
  );
}

function ChartCard({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function RevenuePage() {
  const [trend,   setTrend]   = useState<TrendPoint[]>([]);
  const [units,   setUnits]   = useState<UnitPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [noData,  setNoData]  = useState(false);

  const [sortKey, setSortKey] = useState<SortKey>("revenue");
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/dashboard/charts/revenue-trend").then((r) => r.json()),
      fetch("/api/dashboard/charts/revenue-by-unit").then((r) => r.json()),
    ])
      .then(([t, u]) => {
        const tArr = Array.isArray(t) ? t : [];
        const uArr = Array.isArray(u) ? u : [];
        if (tArr.length === 0 && uArr.length === 0) {
          setNoData(true);
        } else {
          setTrend(tArr);
          setUnits(uArr);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Could not load revenue data.");
        setLoading(false);
      });
  }, []);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((a) => !a);
    else { setSortKey(key); setSortAsc(key === "unit"); }
  }

  const sorted = [...units].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    if (typeof av === "string") return sortAsc ? av.localeCompare(String(bv)) : String(bv).localeCompare(av);
    return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number);
  });

  // Latest period KPIs
  const latestPeriod = trend[trend.length - 1] ?? null;
  const totalRevenue = units.reduce((s, u) => s + u.revenue, 0);
  const activeUnits  = units.filter((u) => u.revenue > 0).length;

  if (loading) return <AnalyticsSkeleton />;

  if (error) {
    return (
      <div className="p-8">
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
          <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-2" />
          <p className="font-medium text-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (noData) {
    return (
      <div className="p-8">
        <div className="rounded-xl border-2 border-dashed border-border bg-muted/20 p-14 text-center">
          <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">No data loaded yet</h3>
          <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
            Upload the Excel accounting workbook to populate all dashboards.
          </p>
          <Link
            href="/upload"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-md font-medium hover:bg-primary/90 transition-colors"
          >
            <Upload className="h-4 w-4" />
            Upload Workbook
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-foreground">Revenue Analytics</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Rental income breakdown across {activeUnits} of 17 units
        </p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
            Total Revenue
          </p>
          <p className="text-xl font-bold text-green-600">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
            Active Units
          </p>
          <p className="text-xl font-bold text-foreground">{activeUnits} / 17</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
            Avg per Unit
          </p>
          <p className="text-xl font-bold text-foreground">
            {activeUnits > 0 ? formatCurrency(totalRevenue / activeUnits) : "—"}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
            MoM Change
          </p>
          <div className="mt-1">
            <ChangeChip change={latestPeriod?.change ?? null} />
          </div>
        </div>
      </div>

      {/* Row 1: Trend chart */}
      <div className="mb-4">
        <ChartCard
          title="Monthly Revenue Trend"
          sub={trend.length === 1 ? "Single period — more months will appear as data is uploaded" : undefined}
        >
          <RevenueTrendChart data={trend} />
        </ChartCard>
      </div>

      {/* Row 2: Bar chart + table side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Revenue by Unit" sub="Ranked highest to lowest">
          <RevenueByUnitChart data={units} />
        </ChartCard>

        {/* League table */}
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Unit League Table</h3>
            <p className="text-xs text-muted-foreground">Click column to sort</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th
                    className={`pb-2 text-left font-semibold uppercase tracking-wide cursor-pointer ${sortKey === "unit" ? "text-primary" : "text-muted-foreground"}`}
                    onClick={() => toggleSort("unit")}
                  >
                    Unit
                  </th>
                  <th
                    className={`pb-2 text-right font-semibold uppercase tracking-wide cursor-pointer ${sortKey === "revenue" ? "text-primary" : "text-muted-foreground"}`}
                    onClick={() => toggleSort("revenue")}
                  >
                    Revenue
                  </th>
                  <th
                    className={`pb-2 text-right font-semibold uppercase tracking-wide cursor-pointer ${sortKey === "pct" ? "text-primary" : "text-muted-foreground"}`}
                    onClick={() => toggleSort("pct")}
                  >
                    % of Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {sorted.map((row, i) => (
                  <tr key={row.unit} className="hover:bg-muted/20">
                    <td className="py-1.5 text-foreground">
                      <span className="text-muted-foreground mr-1.5">{i + 1}.</span>
                      {row.unit}
                    </td>
                    <td className={`py-1.5 text-right font-medium ${row.revenue > 0 ? "text-green-600" : "text-muted-foreground"}`}>
                      {row.revenue > 0 ? formatCurrency(row.revenue) : "—"}
                    </td>
                    <td className="py-1.5 text-right text-muted-foreground">
                      {row.pct > 0 ? `${row.pct}%` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border font-semibold">
                  <td className="pt-2 text-foreground text-xs uppercase tracking-wide">Total</td>
                  <td className="pt-2 text-right text-green-600">{formatCurrency(totalRevenue)}</td>
                  <td className="pt-2 text-right text-muted-foreground">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
