"use client";

import { useState } from "react";
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
  History,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ErrorBoundary } from "@/components/error-boundary";

// ─────────────────────────────────────────────────────────────────────────────
// Navigation items
// ─────────────────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { href: "/dashboard",  icon: BarChart3,   label: "Executive Dashboard",    active: true  },
  { href: "/per-unit",   icon: Building2,   label: "Per-Unit Profitability", active: true  },
  { href: "/revenue",    icon: TrendingUp,  label: "Revenue Analytics",      active: true  },
  { href: "/expenses",   icon: PieChart,    label: "Expense Analytics",      active: true  },
  { href: "/cash-flow",  icon: Droplets,    label: "Cash Flow",              active: true  },
  { href: "/ledger",     icon: BookOpen,    label: "General Ledger",         active: true  },
  { href: "/ratios",     icon: DollarSign,  label: "Financial Ratios",       active: true  },
  { href: "/history",    icon: History,     label: "Upload History",         active: true  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Logout button
// ─────────────────────────────────────────────────────────────────────────────

function LogoutButton() {
  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors justify-center"
    >
      <LogOut className="h-3.5 w-3.5" />
      Sign Out
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar nav list (shared by desktop + mobile drawer)
// ─────────────────────────────────────────────────────────────────────────────

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <>
      {/* Logo */}
      <div className="px-5 py-5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <Building2 className="h-6 w-6 text-primary flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-foreground leading-tight">Lansport</p>
            <p className="text-xs text-muted-foreground">Analytics</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
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
              onClick={onNavigate}
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

      {/* Bottom buttons */}
      <div className="px-3 py-4 border-t border-border space-y-2">
        <Link
          href="/upload"
          onClick={onNavigate}
          className="flex items-center gap-2 w-full bg-primary text-primary-foreground px-3 py-2 rounded-md text-xs font-medium hover:bg-primary/90 transition-colors justify-center"
        >
          <Upload className="h-3.5 w-3.5" />
          Upload Workbook
        </Link>
        <LogoutButton />
      </div>
    </>
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
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">

      {/* ── Desktop sidebar (always visible ≥ lg) ─────────────────────────── */}
      <aside className="hidden lg:flex w-56 flex-shrink-0 flex-col bg-card border-r border-border min-h-screen">
        <SidebarContent />
      </aside>

      {/* ── Mobile: top bar with hamburger ────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0">
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 rounded-md hover:bg-muted transition-colors"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5 text-foreground" />
          </button>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <span className="text-sm font-bold text-foreground">Lansport Analytics</span>
          </div>
        </header>

        {/* ── Main content ──────────────────────────────────────────────────── */}
        <main className="flex-1 overflow-auto">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>

      {/* ── Mobile sidebar drawer ─────────────────────────────────────────── */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer */}
          <aside className="fixed inset-y-0 left-0 z-50 w-64 flex flex-col bg-card border-r border-border lg:hidden">
            <div className="flex items-center justify-end px-3 py-3 border-b border-border">
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1.5 rounded-md hover:bg-muted transition-colors"
                aria-label="Close menu"
              >
                <X className="h-4 w-4 text-foreground" />
              </button>
            </div>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </>
      )}
    </div>
  );
}
