/**
 * Shared CSV utilities for export routes.
 */

/** Escape a cell value: wrap in quotes if it contains commas, quotes or newlines. */
function escapeCell(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Build a CSV string from headers and rows. */
export function buildCsv(
  headers: string[],
  rows: (string | number | null | undefined)[][]
): string {
  const lines = [
    headers.map(escapeCell).join(","),
    ...rows.map((row) => row.map(escapeCell).join(",")),
  ];
  return lines.join("\r\n");
}

/** Return the response headers for a CSV download. */
export function csvHeaders(filename: string): HeadersInit {
  return {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="${filename}"`,
  };
}

/** ISO date string → YYYY-MM-DD for filenames. */
export function today(): string {
  return new Date().toISOString().slice(0, 10);
}
