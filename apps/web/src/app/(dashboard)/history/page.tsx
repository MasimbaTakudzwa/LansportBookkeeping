"use client";

import { useEffect, useState } from "react";
import { Loader2, AlertTriangle, CheckCircle, Clock, XCircle, Upload } from "lucide-react";
import Link from "next/link";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface UploadRecord {
  id: number;
  filename: string;
  checksum: string;
  status: string;
  rowCount: number;
  errorMessage: string | null;
  uploadedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Status badge
// ─────────────────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "complete":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
          <CheckCircle className="h-3 w-3" /> Complete
        </span>
      );
    case "processing":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
          <Clock className="h-3 w-3" /> Processing
        </span>
      );
    case "error":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
          <XCircle className="h-3 w-3" /> Error
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
          {status}
        </span>
      );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function HistoryPage() {
  const [records, setRecords] = useState<UploadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/upload/history")
      .then((r) => r.json())
      .then((data) => {
        setRecords(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setError("Could not load upload history.");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Loading upload history...</p>
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

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">Upload History</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Audit trail of all workbook imports
          </p>
        </div>
        <Link
          href="/upload"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Upload className="h-4 w-4" />
          Upload New
        </Link>
      </div>

      {records.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-border bg-muted/20 p-14 text-center">
          <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No uploads yet</h3>
          <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
            Upload the Excel accounting workbook to get started.
          </p>
          <Link
            href="/upload"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-md font-medium hover:bg-primary/90 transition-colors"
          >
            <Upload className="h-4 w-4" />
            Upload Workbook
          </Link>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Filename</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Uploaded</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Entries</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Checksum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {records.map((r) => (
                <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-medium text-foreground">{r.filename}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                    {new Date(r.uploadedAt).toLocaleString("en-ZA", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.status} />
                    {r.errorMessage && (
                      <p className="text-xs text-destructive mt-1 max-w-[260px] truncate" title={r.errorMessage}>
                        {r.errorMessage}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-foreground tabular-nums">
                    {r.rowCount > 0 ? r.rowCount.toLocaleString() : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                    {r.checksum}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
