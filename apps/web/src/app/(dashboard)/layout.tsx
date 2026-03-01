"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Building2,
  TrendingUp,
  PieChart,
  Droplets,
  BookOpen,
  DollarSign,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Navigation items
// ─────────────────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { href: "/dashboard",  icon: BarChart3,   label: "Executive Dashboard", active: true  },
  { href: "/per-unit",   icon: Building2,   label: "Per-Unit Profitability", active: true  },
  { href: "/revenue",    icon: TrendingUp,  label: "Revenue Analytics",   active: true  },
  { href: "/expenses",   icon: PieChart,    label: "Expense Analytics",   active: false },
  { href: "/cash-flow",  icon: Droplets,    label: "Cash Flow",           active: false },
  { href: "/ledger",     icon: BookOpen,    label: "General Ledger",      active: false },
  { href: "/ratios",     icon: DollarSign,  label: "Financial Ratios",    active: false },
];

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar
// ─────────────────────────────────────────────────────────────────────────────

function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 flex-shrink-0 flex flex-col bg-card border-r border-border min-h-screen">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <Building2 className="h-6 w-6 text-primary flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-foreground leading-tight">
              Lansport
            </p>
            <p className="text-xs text-muted-foreground">Analytics</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5">
        {NAV_ITEMS.map(({ href, icon: Icon, label, active }) => {
          const isCurrent = pathname === href;
          if (!active) {
            return (
              <div
                key={href}
                className="flex items-center gap-2.5 px-3 py-2 rounded-md text-xs text-muted-foreground/50 cursor-not-allowed select-none"
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{label}</span>
                <span className="ml-auto text-[10px] bg-muted px-1 py-0.5 rounded text-muted-foreground/60">
                  Soon
                </span>
              </div>
            );
          }
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-md text-xs transition-colors",
                isCurrent
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Upload button */}
      <div className="px-3 py-4 border-t border-border">
        <Link
          href="/upload"
          className="flex items-center gap-2 w-full bg-primary text-primary-foreground px-3 py-2 rounded-md text-xs font-medium hover:bg-primary/90 transition-colors justify-center"
        >
          <Upload className="h-3.5 w-3.5" />
          Upload Workbook
        </Link>
      </div>
    </aside>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Layout
// ─────────────────────────────────────────────────────────────────────────────

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
