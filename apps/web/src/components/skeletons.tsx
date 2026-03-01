import React from "react";

// Reusable skeleton loader components for all dashboard pages.

function Bone({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`animate-pulse rounded bg-muted ${className ?? ""}`} style={style} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Executive Dashboard skeleton
// ─────────────────────────────────────────────────────────────────────────────

export function DashboardSkeleton() {
  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Bone className="h-7 w-52" />
        <Bone className="h-8 w-24" />
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-4 space-y-2">
            <Bone className="h-2.5 w-20" />
            <Bone className="h-6 w-28" />
          </div>
        ))}
      </div>

      {/* Chart row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-4">
        <div className="lg:col-span-3 rounded-lg border border-border bg-card p-5">
          <Bone className="h-3.5 w-44 mb-4" />
          <Bone className="h-52 w-full" />
        </div>
        <div className="lg:col-span-2 rounded-lg border border-border bg-card p-5">
          <Bone className="h-3.5 w-36 mb-4" />
          <Bone className="h-52 w-full" />
        </div>
      </div>

      {/* Chart row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-lg border border-border bg-card p-5">
          <Bone className="h-3.5 w-36 mb-4" />
          <Bone className="h-52 w-full" />
        </div>
        <div className="rounded-lg border border-border bg-card p-5 space-y-2.5">
          <Bone className="h-3.5 w-28 mb-2" />
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex justify-between">
              <Bone className="h-3 w-28" />
              <Bone className="h-3 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Generic table page skeleton (per-unit, history, etc.)
// ─────────────────────────────────────────────────────────────────────────────

export function TableSkeleton({ rows = 12, cols = 6 }: { rows?: number; cols?: number }) {
  const colWidths = [32, 120, 80, 80, 80, 80, 80, 80].slice(0, cols);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <Bone className="h-7 w-52" />
        <Bone className="h-8 w-28" />
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        {/* table header */}
        <div className="flex gap-4 px-4 py-3 bg-muted/50 border-b border-border">
          {colWidths.map((w, i) => (
            <Bone key={i} className="h-2.5" style={{ width: w }} />
          ))}
        </div>
        {/* rows */}
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4 px-4 py-3 border-b border-border last:border-0">
            {colWidths.map((w, j) => (
              <Bone key={j} className="h-2.5" style={{ width: w }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Analytics page skeleton (KPI cards + two charts)
// ─────────────────────────────────────────────────────────────────────────────

export function AnalyticsSkeleton() {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <Bone className="h-7 w-48" />
        <Bone className="h-8 w-28" />
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-4 space-y-2">
            <Bone className="h-2.5 w-20" />
            <Bone className="h-6 w-28" />
          </div>
        ))}
      </div>

      {/* Two chart cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-5">
            <Bone className="h-3.5 w-40 mb-4" />
            <Bone className="h-48 w-full" />
          </div>
        ))}
      </div>

      {/* Table card */}
      <div className="rounded-lg border border-border bg-card p-5">
        <Bone className="h-3.5 w-36 mb-4" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex gap-4 py-2.5 border-b border-border last:border-0">
            {[120, 80, 80, 80, 60].map((w, j) => (
              <Bone key={j} className="h-2.5" style={{ width: w }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Ledger skeleton (filter bar + paginated table)
// ─────────────────────────────────────────────────────────────────────────────

export function LedgerSkeleton() {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <Bone className="h-7 w-48" />
        <Bone className="h-8 w-28" />
      </div>
      {/* filter bar */}
      <div className="flex gap-2 mb-4">
        <Bone className="h-9 w-48" />
        <Bone className="h-9 w-32" />
        <Bone className="h-9 w-32" />
      </div>
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="flex gap-4 px-4 py-3 bg-muted/50 border-b border-border">
          {[80, 100, 140, 60, 80, 80, 60].map((w, i) => (
            <Bone key={i} className="h-2.5" style={{ width: w }} />
          ))}
        </div>
        {Array.from({ length: 15 }).map((_, i) => (
          <div key={i} className="flex gap-4 px-4 py-3 border-b border-border last:border-0">
            {[80, 100, 140, 60, 80, 80, 60].map((w, j) => (
              <Bone key={j} className="h-2.5" style={{ width: w }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Ratios skeleton (3 sections × ratio cards)
// ─────────────────────────────────────────────────────────────────────────────

export function RatiosSkeleton() {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <Bone className="h-7 w-44" />
        <Bone className="h-8 w-28" />
      </div>
      {[3, 3, 2].map((count, s) => (
        <div key={s} className="mb-6">
          <Bone className="h-4 w-36 mb-3" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className="rounded-lg border border-border bg-card p-5 space-y-2">
                <Bone className="h-3 w-32" />
                <Bone className="h-8 w-24" />
                <Bone className="h-2.5 w-full" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
