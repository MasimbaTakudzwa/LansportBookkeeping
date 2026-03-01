"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Loader2, AlertTriangle, Upload, Search, X, ChevronLeft, ChevronRight, Download,
} from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { LedgerSkeleton } from "@/components/skeletons";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Entry {
  id: number;
  date: string;
  accountNumber: string;
  accountName: string;
  accountType: string;
  description: string;
  debit: number;
  credit: number;
}

interface LedgerResponse {
  entries: Entry[];
  total: number;
  page: number;
  pageSize: number;
}

const ACCOUNT_TYPES = [
  { value: "", label: "All Types" },
  { value: "ASSET",        label: "Asset" },
  { value: "LIABILITY",    label: "Liability" },
  { value: "EQUITY",       label: "Equity" },
  { value: "REVENUE",      label: "Revenue" },
  { value: "EXPENSE",      label: "Expense" },
  { value: "CONTRA_ASSET", label: "Contra Asset" },
];

const TYPE_COLOURS: Record<string, string> = {
  ASSET:        "bg-blue-50 text-blue-700",
  LIABILITY:    "bg-orange-50 text-orange-700",
  EQUITY:       "bg-purple-50 text-purple-700",
  REVENUE:      "bg-green-50 text-green-700",
  EXPENSE:      "bg-red-50 text-red-700",
  CONTRA_ASSET: "bg-gray-50 text-gray-600",
};

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function LedgerPage() {
  const [data,    setData]    = useState<LedgerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [noData,  setNoData]  = useState(false);

  const [query,   setQuery]   = useState("");
  const [account, setAccount] = useState("");
  const [type,    setType]    = useState("");
  const [page,    setPage]    = useState(1);

  // Debounce search
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchLedger = useCallback(
    (q: string, acct: string, t: string, p: number) => {
      setLoading(true);
      const params = new URLSearchParams();
      if (q)    params.set("q",       q);
      if (acct) params.set("account", acct);
      if (t)    params.set("type",    t);
      params.set("page", String(p));

      fetch(`/api/dashboard/ledger?${params}`)
        .then((r) => r.json())
        .then((d) => {
          if (!d.entries) { setNoData(true); setLoading(false); return; }
          if (d.total === 0 && p === 1 && !q && !acct && !t) {
            setNoData(true); setLoading(false); return;
          }
          setData(d);
          setLoading(false);
        })
        .catch(() => { setError("Could not load ledger."); setLoading(false); });
    },
    []
  );

  // Initial load
  useEffect(() => { fetchLedger("", "", "", 1); }, [fetchLedger]);

  // Debounced search
  function handleQueryChange(val: string) {
    setQuery(val);
    setPage(1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchLedger(val, account, type, 1), 350);
  }

  function handleFilterChange(acct: string, t: string) {
    setAccount(acct);
    setType(t);
    setPage(1);
    fetchLedger(query, acct, t, 1);
  }

  function handlePageChange(p: number) {
    setPage(p);
    fetchLedger(query, account, type, p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function clearSearch() {
    setQuery("");
    setPage(1);
    fetchLedger("", account, type, 1);
  }

  // Initial full-page skeleton (before any data has loaded)
  if (loading && data === null && !error && !noData) return <LedgerSkeleton />;

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

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 1;
  const entries    = data?.entries ?? [];
  const totalShown = data?.total ?? 0;

  // Visible debit/credit totals for filtered view
  const visibleDebits  = entries.reduce((s, e) => s + e.debit,  0);
  const visibleCredits = entries.reduce((s, e) => s + e.credit, 0);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-foreground">General Ledger</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Searchable journal entry explorer
          {data && !loading && (
            <> &nbsp;·&nbsp; {totalShown.toLocaleString()} {totalShown === 1 ? "entry" : "entries"}{query || account || type ? " matching filters" : " total"}</>
          )}
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Search description or account…"
            className="w-full pl-8 pr-8 py-2 text-xs rounded-md border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {query && (
            <button onClick={clearSearch} className="absolute right-2.5 top-1/2 -translate-y-1/2">
              <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>

        {/* Account number */}
        <input
          type="text"
          value={account}
          onChange={(e) => handleFilterChange(e.target.value, type)}
          placeholder="Account #"
          className="w-28 px-3 py-2 text-xs rounded-md border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />

        {/* Type filter */}
        <select
          value={type}
          onChange={(e) => handleFilterChange(account, e.target.value)}
          className="px-3 py-2 text-xs rounded-md border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {ACCOUNT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>

        {/* Clear filters */}
        {(query || account || type) && (
          <button
            onClick={() => { setQuery(""); setAccount(""); setType(""); setPage(1); fetchLedger("", "", "", 1); }}
            className="px-3 py-2 text-xs rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            Clear filters
          </button>
        )}

        {/* Export — placed at the end, uses current filter state */}
        <a
          href={`/api/export/ledger${(() => {
            const p = new URLSearchParams();
            if (query)   p.set("q",       query);
            if (account) p.set("account", account);
            if (type)    p.set("type",    type);
            const s = p.toString();
            return s ? `?${s}` : "";
          })()}`}
          download
          className="ml-auto inline-flex items-center gap-1.5 px-3 py-2 text-xs rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </a>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden mb-3">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-3 py-2.5 text-left font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">Date</th>
                <th className="px-3 py-2.5 text-left font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">Account</th>
                <th className="px-3 py-2.5 text-left font-semibold uppercase tracking-wide text-muted-foreground">Type</th>
                <th className="px-3 py-2.5 text-left font-semibold uppercase tracking-wide text-muted-foreground">Description</th>
                <th className="px-3 py-2.5 text-right font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">Debit</th>
                <th className="px-3 py-2.5 text-right font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">Credit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center">
                    <Loader2 className="h-5 w-5 text-primary animate-spin mx-auto" />
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                    No entries match your filters.
                  </td>
                </tr>
              ) : (
                entries.map((e) => (
                  <tr key={e.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{e.date}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className="font-medium text-foreground">{e.accountNumber}</span>
                      <span className="text-muted-foreground ml-1.5 hidden sm:inline">{e.accountName}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${TYPE_COLOURS[e.accountType] ?? "bg-muted text-muted-foreground"}`}>
                        {e.accountType.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-foreground max-w-[220px] truncate" title={e.description}>
                      {e.description}
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-foreground tabular-nums">
                      {e.debit > 0 ? formatCurrency(e.debit) : <span className="text-muted-foreground/40">—</span>}
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-foreground tabular-nums">
                      {e.credit > 0 ? formatCurrency(e.credit) : <span className="text-muted-foreground/40">—</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {/* Visible totals footer */}
            {entries.length > 0 && !loading && (
              <tfoot className="border-t-2 border-border bg-muted/30">
                <tr>
                  <td colSpan={4} className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Page totals ({entries.length} {entries.length === 1 ? "entry" : "entries"})
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-foreground tabular-nums">
                    {formatCurrency(visibleDebits)}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-foreground tabular-nums">
                    {formatCurrency(visibleCredits)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Page {page} of {totalPages} &nbsp;·&nbsp; {totalShown.toLocaleString()} total entries
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-md border border-border disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Prev
            </button>
            {/* Page number buttons — show up to 5 */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let p = i + 1;
              if (totalPages > 5 && page > 3) p = page - 2 + i;
              if (p > totalPages) return null;
              return (
                <button
                  key={p}
                  onClick={() => handlePageChange(p)}
                  className={`px-2.5 py-1.5 text-xs rounded-md border transition-colors ${
                    p === page
                      ? "border-primary bg-primary/10 text-primary font-semibold"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  {p}
                </button>
              );
            })}
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-md border border-border disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted transition-colors"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
