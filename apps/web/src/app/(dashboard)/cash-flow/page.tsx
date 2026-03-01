"use client";

import { useEffect, useState } from "react";
import { Loader2, AlertTriangle, Upload } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { CashBalanceChart } from "@/components/charts/cash-balance-chart";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface CashPoint {
  date: string;
  balance: number;
}

interface FlowRow {
  date: string;
  description: string;
  account: string;
  inflow: number;
  outflow: number;
  balance: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function CashFlowPage() {
  const [cashSeries, setCashSeries] = useState<CashPoint[]>([]);
  const [flowRows,   setFlowRows]   = useState<FlowRow[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [noData,     setNoData]     = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/dashboard/charts/cash-balance").then((r) => r.json()),
      fetch("/api/dashboard/cash-flow").then((r) => r.json()),
    ])
      .then(([series, rows]) => {
        const sArr = Array.isArray(series) ? series : [];
        const rArr = Array.isArray(rows)   ? rows   : [];
        if (sArr.length === 0) {
          setNoData(true);
        } else {
          setCashSeries(sArr);
          setFlowRows(rArr);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Could not load cash flow data.");
        setLoading(false);
      });
  }, []);

  const currentBalance = cashSeries.length > 0
    ? cashSeries[cashSeries.length - 1].balance
    : 0;
  const startBalance = cashSeries.length > 0 ? cashSeries[0].balance : 0;
  const totalInflow  = flowRows.reduce((s, r) => s + r.inflow,  0);
  const totalOutflow = flowRows.reduce((s, r) => s + r.outflow, 0);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Loading cash flow data...</p>
      </div>
    );
  }

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
        <h2 className="text-xl font-bold text-foreground">Cash Flow</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Running balance and daily transaction detail for Account #1000 (Cash)
        </p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
            Current Balance
          </p>
          <p className="text-xl font-bold text-blue-600">{formatCurrency(currentBalance)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
            Total Inflows
          </p>
          <p className="text-xl font-bold text-green-600">{formatCurrency(totalInflow)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
            Total Outflows
          </p>
          <p className="text-xl font-bold text-destructive">{formatCurrency(totalOutflow)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
            Net Change
          </p>
          <p className={`text-xl font-bold ${currentBalance - startBalance >= 0 ? "text-green-600" : "text-destructive"}`}>
            {formatCurrency(currentBalance - startBalance)}
          </p>
        </div>
      </div>

      {/* Running balance chart */}
      <div className="rounded-lg border border-border bg-card p-5 mb-4">
        <h3 className="text-sm font-semibold text-foreground mb-4">Running Cash Balance</h3>
        <CashBalanceChart data={cashSeries} />
      </div>

      {/* Transaction table */}
      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">
          Cash Transactions ({flowRows.length})
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-3 py-2.5 text-left font-semibold uppercase tracking-wide text-muted-foreground">Date</th>
                <th className="px-3 py-2.5 text-left font-semibold uppercase tracking-wide text-muted-foreground">Description</th>
                <th className="px-3 py-2.5 text-right font-semibold uppercase tracking-wide text-muted-foreground">Inflow</th>
                <th className="px-3 py-2.5 text-right font-semibold uppercase tracking-wide text-muted-foreground">Outflow</th>
                <th className="px-3 py-2.5 text-right font-semibold uppercase tracking-wide text-muted-foreground">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {flowRows.map((row, i) => (
                <tr key={i} className="hover:bg-muted/20">
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{row.date}</td>
                  <td className="px-3 py-2 text-foreground max-w-[280px] truncate" title={row.description}>
                    {row.description}
                  </td>
                  <td className="px-3 py-2 text-right text-green-600 font-medium">
                    {row.inflow > 0 ? formatCurrency(row.inflow) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-3 py-2 text-right text-destructive font-medium">
                    {row.outflow > 0 ? formatCurrency(row.outflow) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-blue-600">
                    {formatCurrency(row.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
