"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Upload, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { AnalyticsSkeleton } from "@/components/skeletons";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { ExpenseTrendChart } from "@/components/charts/expense-trend-chart";
import { ExpenseDonutChart } from "@/components/charts/expense-donut-chart";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface TrendPoint {
  period: string;
  expenses: number;
  change: number | null;
}

interface CategoryRow {
  name: string;
  value: number;
}

type SortKey = "name" | "value" | "pct";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function ChangeChip({ change }: { change: number | null }) {
  if (change === null)
    return <span className="text-muted-foreground text-xs">—</span>;
  if (change > 0)
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-destructive">
        <TrendingUp className="h-3 w-3" />+{change}%
      </span>
    );
  if (change < 0)
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-green-600">
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

export default function ExpensesPage() {
  const [trend,      setTrend]      = useState<TrendPoint[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [noData,     setNoData]     = useState(false);

  const [sortKey, setSortKey] = useState<SortKey>("value");
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/dashboard/charts/expense-trend").then((r) => r.json()),
      fetch("/api/dashboard/charts/expenses-breakdown").then((r) => r.json()),
    ])
      .then(([t, c]) => {
        const tArr = Array.isArray(t) ? t : [];
        const cArr = Array.isArray(c) ? c : [];
        if (tArr.length === 0 && cArr.length === 0) {
          setNoData(true);
        } else {
          setTrend(tArr);
          setCategories(cArr);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Could not load expense data.");
        setLoading(false);
      });
  }, []);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((a) => !a);
    else { setSortKey(key); setSortAsc(key === "name"); }
  }

  const totalExpenses = categories.reduce((s, c) => s + c.value, 0);

  // Enrich categories with pct for sorting/display
  const enriched = categories.map((c) => ({
    ...c,
    pct: totalExpenses > 0 ? Math.round((c.value / totalExpenses) * 1000) / 10 : 0,
  }));

  const sorted = [...enriched].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    if (typeof av === "string") return sortAsc ? av.localeCompare(String(bv)) : String(bv).localeCompare(av);
    return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number);
  });

  const latestPeriod = trend[trend.length - 1] ?? null;
  const avgPerCategory = categories.length > 0 ? totalExpenses / categories.length : 0;
  const largestCategory = enriched.length > 0
    ? enriched.reduce((max, c) => c.value > max.value ? c : max, enriched[0])
    : null;

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
        <h2 className="text-xl font-bold text-foreground">Expense Analytics</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Cost breakdown across {categories.length} expense categories
        </p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
            Total Expenses
          </p>
          <p className="text-xl font-bold text-destructive">{formatCurrency(totalExpenses)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
            Categories
          </p>
          <p className="text-xl font-bold text-foreground">{categories.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
            Largest Category
          </p>
          <p className="text-sm font-bold text-foreground truncate" title={largestCategory?.name ?? "—"}>
            {largestCategory?.name ?? "—"}
          </p>
          {largestCategory && (
            <p className="text-xs text-muted-foreground">{formatCurrency(largestCategory.value)}</p>
          )}
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

      {/* Row 1: Expense trend */}
      <div className="mb-4">
        <ChartCard
          title="Monthly Expense Trend"
          sub={trend.length === 1 ? "Single period — more months will appear as data is uploaded" : undefined}
        >
          <ExpenseTrendChart data={trend} />
        </ChartCard>
      </div>

      {/* Row 2: Donut chart + breakdown table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Expense Distribution" sub="By account category">
          <ExpenseDonutChart data={categories} />
        </ChartCard>

        {/* Breakdown table */}
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Category Breakdown</h3>
            <p className="text-xs text-muted-foreground">Click column to sort</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th
                    className={`pb-2 text-left font-semibold uppercase tracking-wide cursor-pointer ${sortKey === "name" ? "text-primary" : "text-muted-foreground"}`}
                    onClick={() => toggleSort("name")}
                  >
                    Category
                  </th>
                  <th
                    className={`pb-2 text-right font-semibold uppercase tracking-wide cursor-pointer ${sortKey === "value" ? "text-primary" : "text-muted-foreground"}`}
                    onClick={() => toggleSort("value")}
                  >
                    Amount
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
                {sorted.map((row) => (
                  <tr key={row.name} className="hover:bg-muted/20">
                    <td className="py-1.5 text-foreground truncate max-w-[160px]" title={row.name}>
                      {row.name}
                    </td>
                    <td className="py-1.5 text-right font-medium text-destructive">
                      {formatCurrency(row.value)}
                    </td>
                    <td className="py-1.5 text-right text-muted-foreground">
                      {row.pct}%
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border font-semibold">
                  <td className="pt-2 text-foreground text-xs uppercase tracking-wide">Total</td>
                  <td className="pt-2 text-right text-destructive">{formatCurrency(totalExpenses)}</td>
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
