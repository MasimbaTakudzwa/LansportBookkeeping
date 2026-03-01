"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Upload, CheckCircle, AlertCircle, MinusCircle, Download } from "lucide-react";
import { RatiosSkeleton } from "@/components/skeletons";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface RatiosResponse {
  hasData: boolean;
  income?: {
    totalRevenue: number;
    totalExpenses: number;
    netIncome: number;
    grossMargin: number | null;
    operatingMargin: number | null;
    expenseRatio: number | null;
  };
  balanceSheet?: {
    totalAssets: number;
    totalLiabilities: number;
    totalEquity: number;
    cashPosition: number;
  };
  ratios?: {
    netProfitMargin:  number | null;
    returnOnEquity:   number | null;
    returnOnAssets:   number | null;
    currentRatio:     number | null;
    quickRatio:       number | null;
    cashRatio:        number | null;
    debtToEquity:     number | null;
    debtRatio:        number | null;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Health indicator
// ─────────────────────────────────────────────────────────────────────────────

type Health = "good" | "warn" | "bad" | "neutral";

function HealthDot({ health }: { health: Health }) {
  if (health === "good")    return <CheckCircle  className="h-4 w-4 text-green-600 flex-shrink-0" />;
  if (health === "warn")    return <AlertCircle  className="h-4 w-4 text-yellow-500 flex-shrink-0" />;
  if (health === "bad")     return <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />;
  return <MinusCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Ratio card
// ─────────────────────────────────────────────────────────────────────────────

function RatioCard({
  label,
  value,
  unit = "",
  health,
  desc,
  benchmark,
}: {
  label: string;
  value: number | null;
  unit?: string;
  health: Health;
  desc: string;
  benchmark: string;
}) {
  const displayVal =
    value === null
      ? "N/A"
      : unit === "%"
      ? `${value.toFixed(1)}%`
      : value.toFixed(2);

  const valueColour =
    health === "good" ? "text-green-600" :
    health === "warn" ? "text-yellow-600" :
    health === "bad"  ? "text-destructive" :
    "text-foreground";

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide leading-tight">
          {label}
        </p>
        <HealthDot health={health} />
      </div>
      <p className={`text-2xl font-bold mb-1 ${valueColour}`}>{displayVal}</p>
      <p className="text-xs text-muted-foreground leading-snug mb-2">{desc}</p>
      <p className="text-[10px] text-muted-foreground/70 border-t border-border pt-1.5 mt-auto">
        {benchmark}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section heading
// ─────────────────────────────────────────────────────────────────────────────

function SectionHeading({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-4">
      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">{title}</h3>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Health logic
// ─────────────────────────────────────────────────────────────────────────────

function marginHealth(v: number | null): Health {
  if (v === null) return "neutral";
  if (v >= 70) return "good";
  if (v >= 40) return "warn";
  return "bad";
}
function roeHealth(v: number | null): Health {
  if (v === null) return "neutral";
  if (v >= 15) return "good";
  if (v >= 8)  return "warn";
  return "bad";
}
function currentRatioHealth(v: number | null): Health {
  if (v === null) return "neutral";
  if (v >= 2)   return "good";
  if (v >= 1)   return "warn";
  return "bad";
}
function debtToEquityHealth(v: number | null): Health {
  if (v === null) return "neutral";
  if (v <= 0.5) return "good";
  if (v <= 1.5) return "warn";
  return "bad";
}
function debtRatioHealth(v: number | null): Health {
  if (v === null) return "neutral";
  if (v <= 0.4) return "good";
  if (v <= 0.6) return "warn";
  return "bad";
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function RatiosPage() {
  const [data,    setData]    = useState<RatiosResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/dashboard/ratios")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => { setError("Could not load ratios."); setLoading(false); });
  }, []);

  if (loading) return <RatiosSkeleton />;

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

  if (!data?.hasData) {
    return (
      <div className="p-8">
        <div className="rounded-xl border-2 border-dashed border-border bg-muted/20 p-14 text-center">
          <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">No data loaded yet</h3>
          <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
            Upload the Excel accounting workbook to compute financial ratios.
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

  const { income, balanceSheet, ratios } = data;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">Financial Ratios</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Key performance indicators and balance sheet health metrics
          </p>
        </div>
        <a
          href="/api/export/ratios"
          download
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </a>
      </div>

      {/* Base figures summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Revenue</p>
          <p className="text-lg font-bold text-green-600">{formatCurrency(income?.totalRevenue ?? 0)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Expenses</p>
          <p className="text-lg font-bold text-destructive">{formatCurrency(income?.totalExpenses ?? 0)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Total Assets</p>
          <p className="text-lg font-bold text-foreground">{formatCurrency(balanceSheet?.totalAssets ?? 0)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Equity</p>
          <p className="text-lg font-bold text-foreground">{formatCurrency(balanceSheet?.totalEquity ?? 0)}</p>
        </div>
      </div>

      {/* ── Profitability ── */}
      <div className="mb-8">
        <SectionHeading
          title="Profitability"
          sub="How efficiently revenue is converted to profit"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <RatioCard
            label="Net Profit Margin"
            value={ratios?.netProfitMargin ?? null}
            unit="%"
            health={marginHealth(ratios?.netProfitMargin ?? null)}
            desc="Net income as a percentage of total revenue."
            benchmark="Good: ≥ 70% for rental property"
          />
          <RatioCard
            label="Return on Equity"
            value={ratios?.returnOnEquity ?? null}
            unit="%"
            health={roeHealth(ratios?.returnOnEquity ?? null)}
            desc="Net income relative to owner's equity. Measures return on invested capital."
            benchmark="Good: ≥ 15% | Acceptable: ≥ 8%"
          />
          <RatioCard
            label="Return on Assets"
            value={ratios?.returnOnAssets ?? null}
            unit="%"
            health={roeHealth(ratios?.returnOnAssets ?? null)}
            desc="Net income relative to total assets. Higher = better asset utilisation."
            benchmark="Good: ≥ 10% | Acceptable: ≥ 5%"
          />
        </div>
      </div>

      {/* ── Liquidity ── */}
      <div className="mb-8">
        <SectionHeading
          title="Liquidity"
          sub="Ability to meet short-term obligations"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <RatioCard
            label="Current Ratio"
            value={ratios?.currentRatio ?? null}
            health={currentRatioHealth(ratios?.currentRatio ?? null)}
            desc="Current assets ÷ current liabilities. Shows ability to pay near-term debts."
            benchmark="Good: ≥ 2.0 | Acceptable: ≥ 1.0"
          />
          <RatioCard
            label="Quick Ratio"
            value={ratios?.quickRatio ?? null}
            health={currentRatioHealth(ratios?.quickRatio ?? null)}
            desc="(Current assets − cash) ÷ current liabilities. More conservative than current ratio."
            benchmark="Good: ≥ 1.0 | Acceptable: ≥ 0.5"
          />
          <RatioCard
            label="Cash Ratio"
            value={ratios?.cashRatio ?? null}
            health={currentRatioHealth(ratios?.cashRatio ?? null)}
            desc="Cash ÷ current liabilities. Strictest liquidity measure — can we pay debts with cash alone?"
            benchmark="Good: ≥ 0.5 | High = excess idle cash"
          />
        </div>
      </div>

      {/* ── Leverage ── */}
      <div className="mb-4">
        <SectionHeading
          title="Leverage"
          sub="Debt levels relative to assets and equity"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <RatioCard
            label="Debt-to-Equity"
            value={ratios?.debtToEquity ?? null}
            health={debtToEquityHealth(ratios?.debtToEquity ?? null)}
            desc="Total liabilities ÷ owner's equity. Lower = less financial risk."
            benchmark="Good: ≤ 0.5 | Acceptable: ≤ 1.5"
          />
          <RatioCard
            label="Debt Ratio"
            value={ratios?.debtRatio ?? null}
            health={debtRatioHealth(ratios?.debtRatio ?? null)}
            desc="Total liabilities ÷ total assets. Proportion of assets financed by debt."
            benchmark="Good: ≤ 0.4 | Acceptable: ≤ 0.6"
          />
          <div className="rounded-lg border border-border bg-card p-5 flex items-center justify-center">
            <p className="text-xs text-muted-foreground text-center leading-relaxed">
              More leverage ratios will appear as liabilities are recorded in the workbook.
            </p>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <p className="text-[11px] text-muted-foreground mt-6 border-t border-border pt-4">
        Ratios computed from current period data only. Liquidity ratios (current/quick/cash) require
        liability accounts to be populated. N/A indicates the denominator is zero.
        Benchmarks are indicative for South African residential rental property.
      </p>
    </div>
  );
}
