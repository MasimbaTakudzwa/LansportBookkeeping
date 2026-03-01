"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Upload,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { RevenueExpensesChart } from "@/components/charts/revenue-expenses-chart";
import { CashBalanceChart }     from "@/components/charts/cash-balance-chart";
import { ExpenseDonutChart }    from "@/components/charts/expense-donut-chart";
import { DashboardSkeleton }    from "@/components/skeletons";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface DashboardSummary {
  hasData: boolean;
  totalRevenue?: number;
  totalExpenses?: number;
  netIncome?: number;
  cashPosition?: number;
  operatingMargin?: number;
  occupiedUnits?: number;
  totalUnits?: number;
  entryCount?: number;
  lastUploadDate?: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// KPI Card
// ─────────────────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "positive" | "negative" | "neutral";
}) {
  const accentClass =
    accent === "positive" ? "text-green-600" :
    accent === "negative" ? "text-destructive" :
    "text-foreground";

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className={`text-xl font-bold ${accentClass}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Chart section card
// ─────────────────────────────────────────────────────────────────────────────

function ChartCard({
  title, children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4">{title}</h3>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Integrity badge
// ─────────────────────────────────────────────────────────────────────────────

function IntegrityBadge() {
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/integrity")
      .then((r) => r.json())
      .then((d) => {
        if (!d.hasData) { setOk(null); return; }
        setOk(d.trialBalance?.balanced && d.balanceSheet?.balanced);
      })
      .catch(() => setOk(null));
  }, []);

  if (ok === null) return null;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
        ok
          ? "bg-green-50 text-green-700 border border-green-200"
          : "bg-yellow-50 text-yellow-700 border border-yellow-200"
      }`}
    >
      {ok ? (
        <>
          <CheckCircle className="h-3.5 w-3.5" />
          Trial balance verified
        </>
      ) : (
        <>
          <AlertTriangle className="h-3.5 w-3.5" />
          Integrity issue detected
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  // Chart data
  const [revExpData,   setRevExpData]   = useState<{period: string; revenue: number; expenses: number}[]>([]);
  const [cashData,     setCashData]     = useState<{date: string; balance: number}[]>([]);
  const [expBreakdown, setExpBreakdown] = useState<{name: string; value: number}[]>([]);

  // Period filter — available months + selected range
  const [periods,  setPeriods]  = useState<{value: string; label: string}[]>([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate,   setToDate]   = useState("");

  const fetchAll = (from = fromDate, to = toDate) => {
    setLoading(true);
    setError(null);

    const chartParams = new URLSearchParams();
    if (from) chartParams.set("from", from);
    if (to)   chartParams.set("to",   to);
    const qs = chartParams.toString() ? `?${chartParams}` : "";

    Promise.all([
      fetch("/api/dashboard/summary").then((r) => r.json()),
      fetch(`/api/dashboard/charts/revenue-expenses${qs}`).then((r) => r.json()),
      fetch(`/api/dashboard/charts/cash-balance${qs}`).then((r) => r.json()),
      fetch("/api/dashboard/charts/expenses-breakdown").then((r) => r.json()),
      fetch("/api/dashboard/periods").then((r) => r.json()),
    ])
      .then(([sum, rev, cash, exp, pds]) => {
        setSummary(sum);
        setRevExpData(Array.isArray(rev) ? rev : []);
        setCashData(Array.isArray(cash) ? cash : []);
        setExpBreakdown(Array.isArray(exp) ? exp : []);
        if (Array.isArray(pds) && pds.length > 0) {
          setPeriods(pds);
          // Default: full range on first load
          if (!fromDate && !toDate) {
            setFromDate(pds[0].value);
            setToDate(pds[pds.length - 1].value);
          }
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Could not connect to the database.");
        setLoading(false);
      });
  };

  useEffect(() => { fetchAll(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const lastUpload = summary?.lastUploadDate
    ? new Date(summary.lastUploadDate).toLocaleString("en-ZA", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) return <DashboardSkeleton />;

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="p-8">
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
          <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-2" />
          <p className="font-medium text-foreground">{error}</p>
          <button onClick={fetchAll} className="mt-3 text-sm text-primary hover:underline">
            Try again
          </button>
        </div>
      </div>
    );
  }

  // ── No data ────────────────────────────────────────────────────────────────
  if (!summary?.hasData) {
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

  // ── Dashboard ──────────────────────────────────────────────────────────────
  return (
    <div className="p-6">
      {/* Header strip */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">Executive Dashboard</h2>
          {lastUpload && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Last updated: {lastUpload}&nbsp;·&nbsp;
              {summary.entryCount?.toLocaleString()} journal entries
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Period filter — only shown when multiple months exist */}
          {periods.length > 1 && (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-muted-foreground">Charts:</span>
              <select
                value={fromDate}
                onChange={(e) => { setFromDate(e.target.value); fetchAll(e.target.value, toDate); }}
                className="px-2 py-1.5 rounded-md border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {periods.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
              <span className="text-muted-foreground">→</span>
              <select
                value={toDate}
                onChange={(e) => { setToDate(e.target.value); fetchAll(fromDate, e.target.value); }}
                className="px-2 py-1.5 rounded-md border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {periods.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          )}
          <IntegrityBadge />
          <button
            onClick={() => fetchAll()}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground px-3 py-2 rounded-md hover:bg-muted transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
        <KpiCard
          label="Total Revenue"
          value={formatCurrency(summary.totalRevenue ?? 0)}
          accent="positive"
        />
        <KpiCard
          label="Total Expenses"
          value={formatCurrency(summary.totalExpenses ?? 0)}
          accent="neutral"
        />
        <KpiCard
          label="Net Income"
          value={formatCurrency(summary.netIncome ?? 0)}
          accent={(summary.netIncome ?? 0) >= 0 ? "positive" : "negative"}
        />
        <KpiCard
          label="Cash Position"
          value={formatCurrency(summary.cashPosition ?? 0)}
          sub="Account #1000"
          accent="positive"
        />
        <KpiCard
          label="Operating Margin"
          value={`${(summary.operatingMargin ?? 0).toFixed(1)}%`}
          accent={(summary.operatingMargin ?? 0) >= 70 ? "positive" : "negative"}
        />
        <KpiCard
          label="Occupancy"
          value={`${summary.occupiedUnits ?? 0} / ${summary.totalUnits ?? 17}`}
          sub="rental units"
          accent={
            (summary.occupiedUnits ?? 0) === (summary.totalUnits ?? 17)
              ? "positive"
              : "neutral"
          }
        />
      </div>

      {/* Charts row 1: Revenue vs Expenses (wide) + Cash Balance */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-4">
        <div className="lg:col-span-3">
          <ChartCard title="Revenue vs Expenses (by Month)">
            <RevenueExpensesChart data={revExpData} />
          </ChartCard>
        </div>
        <div className="lg:col-span-2">
          <ChartCard title="Cash Balance Over Time">
            <CashBalanceChart data={cashData} />
          </ChartCard>
        </div>
      </div>

      {/* Charts row 2: Expense breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <ChartCard title="Expense Distribution">
            <ExpenseDonutChart data={expBreakdown} />
          </ChartCard>
        </div>
        <div>
          {/* Expense summary table */}
          <div className="rounded-lg border border-border bg-card p-5 h-full">
            <h3 className="text-sm font-semibold text-foreground mb-3">Top Expenses</h3>
            {expBreakdown.length === 0 ? (
              <p className="text-xs text-muted-foreground">No expense data.</p>
            ) : (
              <ul className="space-y-1.5">
                {expBreakdown.slice(0, 8).map((item) => (
                  <li key={item.name} className="flex items-center justify-between gap-2">
                    <span className="text-xs text-foreground truncate max-w-[130px]" title={item.name}>
                      {item.name}
                    </span>
                    <span className="text-xs font-medium text-foreground whitespace-nowrap">
                      {formatCurrency(item.value)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
