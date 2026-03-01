import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildCsv, csvHeaders, today } from "@/lib/csv";

export const dynamic = "force-dynamic";

interface Row {
  date: string;
  account_number: string;
  account_name: string;
  account_type: string;
  description: string;
  debit: string;
  credit: string;
}

export async function GET(req: Request) {
  try {
    const count = await db.journalEntry.count();
    if (count === 0) {
      return new NextResponse("No data available.", { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const q       = (searchParams.get("q")       ?? "").trim();
    const acctNum = (searchParams.get("account") ?? "").trim();
    const type    = (searchParams.get("type")    ?? "").trim().toUpperCase();

    const conditions: string[] = [];
    const binds: (string | number)[] = [];
    let idx = 1;

    if (q) {
      conditions.push(`(LOWER(je.description) LIKE $${idx} OR a.account_number LIKE $${idx + 1} OR LOWER(a.name) LIKE $${idx + 2})`);
      const like = `%${q.toLowerCase()}%`;
      binds.push(like, like, like);
      idx += 3;
    }
    if (acctNum) {
      conditions.push(`a.account_number = $${idx}`);
      binds.push(acctNum);
      idx += 1;
    }
    if (type && ["ASSET","LIABILITY","EQUITY","REVENUE","EXPENSE","CONTRA_ASSET"].includes(type)) {
      conditions.push(`a.type = $${idx}`);
      binds.push(type);
      idx += 1;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const rows = await db.$queryRawUnsafe<Row[]>(
      `SELECT
         TO_CHAR(je.date, 'YYYY-MM-DD') AS date,
         a.account_number,
         a.name                          AS account_name,
         a.type::TEXT                    AS account_type,
         je.description,
         ROUND(je.debit,  2)::TEXT       AS debit,
         ROUND(je.credit, 2)::TEXT       AS credit
       FROM journal_entries je
       JOIN accounts a ON je.account_id = a.id
       ${where}
       ORDER BY je.date, a.account_number, je.id`,
      ...binds
    );

    const headers = ["Date", "Account #", "Account Name", "Type", "Description", "Debit (USD)", "Credit (USD)"];
    const csvRows = rows.map((r) => [
      r.date,
      r.account_number,
      r.account_name,
      r.account_type,
      r.description,
      parseFloat(r.debit),
      parseFloat(r.credit),
    ]);

    const csv = buildCsv(headers, csvRows);
    const suffix = q || acctNum || type ? "-filtered" : "";
    return new NextResponse(csv, { headers: csvHeaders(`ledger${suffix}-${today()}.csv`) });
  } catch (error) {
    console.error("Export ledger error:", error);
    return new NextResponse("Export failed.", { status: 500 });
  }
}
