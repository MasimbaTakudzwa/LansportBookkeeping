"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ArrowUpDown, Upload, Download } from "lucide-react";
import { TableSkeleton } from "@/components/skeletons";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface UnitRow {
  name: string;
  group: string;
  revenue: number;
  rm: number;
  levy: number;
  net: number;
  margin: number | null;
}

type SortKey = "name" | "revenue" | "rm" | "levy" | "net" | "margin";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function marginClass(m: number | null): string {
  if (m === null) return "text-muted-foreground";
  if (m >= 80) return "text-green-600 font-semibold";
  if (m >= 50) return "text-yellow-600 font-semibold";
  return "text-destructive font-semibold";
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function PerUnitPage() {
  const [rows,    setRows]    = useState<UnitRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [noData,  setNoData]  = useState(false);

  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortAsc, setSortAsc] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/per-unit")
      .then((r) => r.json())
      .then((data) => {
        if (!Array.isArray(data) || data.length === 0) {
          setNoData(true);
        } else {
          setRows(data);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Could not load per-unit data.");
        setLoading(false);
      });
  }, []);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc((a) => !a);
    } else {
      setSortKey(key);
      setSortAsc(key === "name");
    }
  }

  const sorted = [...rows].sort((a, b) => {
    let av: string | number | null = a[sortKey];
    let bv: string | number | null = b[sortKey];
    if (av === null) av = -Infinity;
    if (bv === null) bv = -Infinity;
    if (typeof av === "string") return sortAsc ? av.localeCompare(String(bv)) : String(bv).localeCompare(av);
    return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number);
  });

  // Summary row
  const totRevenue = rows.reduce((s, r) => s + r.revenue, 0);
  const totRm      = rows.reduce((s, r) => s + r.rm,      0);
  const totLevy    = rows.reduce((s, r) => s + r.levy,    0);
  const totNet     = rows.reduce((s, r) => s + r.net,     0);
  const totMargin  = totRevenue > 0 ? (totNet / totRevenue) * 100 : null;

  function SortTh({ label, k }: { label: string; k: SortKey }) {
    const active = sortKey === k;
    return (
      <th
        className={`px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide cursor-pointer select-none whitespace-nowrap ${
          active ? "text-primary" : "text-muted-foreground"
        }`}
        onClick={() => toggleSort(k)}
      >
        <span className="inline-flex items-center gap-1 justify-end">
          {label}
          <ArrowUpDown className="h-3 w-3 opacity-50" />
        </span>
      </th>
    );
  }

  if (loading) return <TableSkeleton rows={17} cols={7} />;

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
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">Per-Unit Profitability</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Net contribution margin for all {rows.length} rental units. Click a column heading to sort.
          </p>
        </div>
        <a
          href="/api/export/per-unit"
          download
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </a>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th
                  className={`px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide cursor-pointer select-none ${
                    sortKey === "name" ? "text-primary" : "text-muted-foreground"
                  }`}
                  onClick={() => toggleSort("name")}
                >
                  <span className="inline-flex items-center gap-1">
                    Unit
                    <ArrowUpDown className="h-3 w-3 opacity-50" />
                  </span>
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Group
                </th>
                <SortTh label="Revenue"  k="revenue" />
                <SortTh label="R&M"      k="rm"      />
                <SortTh label="Levy"     k="levy"    />
                <SortTh label="Net"      k="net"     />
                <SortTh label="Margin %"  k="margin"  />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sorted.map((row) => (
                <tr key={row.name} className="hover:bg-muted/20 transition-colors">
                  <td className="px-3 py-2.5 font-medium text-foreground whitespace-nowrap">
                    {row.name}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                    {row.group}
                  </td>
                  <td className="px-3 py-2.5 text-right text-green-600 font-medium">
                    {row.revenue > 0 ? formatCurrency(row.revenue) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-right text-foreground">
                    {row.rm > 0 ? formatCurrency(row.rm) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-right text-foreground">
                    {row.levy > 0 ? formatCurrency(row.levy) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className={`px-3 py-2.5 text-right ${row.net >= 0 ? "text-green-600" : "text-destructive"} font-medium`}>
                    {formatCurrency(row.net)}
                  </td>
                  <td className={`px-3 py-2.5 text-right ${marginClass(row.margin)}`}>
                    {row.margin !== null ? `${row.margin.toFixed(1)}%` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
            {/* Totals footer */}
            <tfoot className="border-t-2 border-border bg-muted/30">
              <tr>
                <td className="px-3 py-2.5 font-semibold text-foreground text-xs uppercase tracking-wide" colSpan={2}>
                  Portfolio Total
                </td>
                <td className="px-3 py-2.5 text-right text-green-600 font-semibold">
                  {formatCurrency(totRevenue)}
                </td>
                <td className="px-3 py-2.5 text-right font-semibold text-foreground">
                  {formatCurrency(totRm)}
                </td>
                <td className="px-3 py-2.5 text-right font-semibold text-foreground">
                  {formatCurrency(totLevy)}
                </td>
                <td className={`px-3 py-2.5 text-right font-semibold ${totNet >= 0 ? "text-green-600" : "text-destructive"}`}>
                  {formatCurrency(totNet)}
                </td>
                <td className={`px-3 py-2.5 text-right font-semibold ${marginClass(totMargin)}`}>
                  {totMargin !== null ? `${totMargin.toFixed(1)}%` : "—"}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Legend */}
      <p className="text-xs text-muted-foreground mt-3">
        Net = Revenue − R&amp;M − Levy &nbsp;·&nbsp; Margin = Net ÷ Revenue &nbsp;·&nbsp;
        <span className="text-green-600">Green ≥ 80%</span>&nbsp;
        <span className="text-yellow-600">Yellow ≥ 50%</span>&nbsp;
        <span className="text-destructive">Red &lt; 50%</span>
      </p>
    </div>
  );
}
