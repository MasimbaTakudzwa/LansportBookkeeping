import { NextResponse } from "next/server";
import { buildCsv, csvHeaders, today } from "@/lib/csv";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    // Fetch ratios from our own API (avoids duplicating the SQL)
    const base = new URL(req.url).origin;
    const res  = await fetch(`${base}/api/dashboard/ratios`);
    const data = await res.json();

    if (!data.hasData) {
      return new NextResponse("No data available.", { status: 404 });
    }

    const { income, balanceSheet, ratios } = data;

    const headers = ["Category", "Metric", "Value", "Unit"];
    const rows: (string | number)[][] = [
      // Income statement
      ["Income", "Total Revenue",    income.totalRevenue,    "ZAR"],
      ["Income", "Total Expenses",   income.totalExpenses,   "ZAR"],
      ["Income", "Net Income",       income.netIncome,       "ZAR"],
      ["Income", "Operating Margin", income.operatingMargin ?? "", "%"],
      ["Income", "Expense Ratio",    income.expenseRatio    ?? "", "%"],
      // Balance sheet
      ["Balance Sheet", "Total Assets",       balanceSheet.totalAssets,       "ZAR"],
      ["Balance Sheet", "Total Liabilities",  balanceSheet.totalLiabilities,  "ZAR"],
      ["Balance Sheet", "Total Equity",       balanceSheet.totalEquity,       "ZAR"],
      ["Balance Sheet", "Cash Position",      balanceSheet.cashPosition,      "ZAR"],
      // Ratios
      ["Profitability", "Net Profit Margin",  ratios.netProfitMargin  ?? "N/A", "%"],
      ["Profitability", "Return on Equity",   ratios.returnOnEquity   ?? "N/A", "%"],
      ["Profitability", "Return on Assets",   ratios.returnOnAssets   ?? "N/A", "%"],
      ["Liquidity",     "Current Ratio",      ratios.currentRatio     ?? "N/A", "x"],
      ["Liquidity",     "Quick Ratio",        ratios.quickRatio       ?? "N/A", "x"],
      ["Liquidity",     "Cash Ratio",         ratios.cashRatio        ?? "N/A", "x"],
      ["Leverage",      "Debt-to-Equity",     ratios.debtToEquity     ?? "N/A", "x"],
      ["Leverage",      "Debt Ratio",         ratios.debtRatio        ?? "N/A", "x"],
    ];

    const csv = buildCsv(headers, rows);
    return new NextResponse(csv, { headers: csvHeaders(`financial-ratios-${today()}.csv`) });
  } catch (error) {
    console.error("Export ratios error:", error);
    return new NextResponse("Export failed.", { status: 500 });
  }
}
