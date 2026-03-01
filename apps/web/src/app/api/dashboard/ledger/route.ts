import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

interface Row {
  id: number;
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
    const { searchParams } = new URL(req.url);
    const page    = Math.max(1, parseInt(searchParams.get("page")    ?? "1", 10));
    const q       = (searchParams.get("q")       ?? "").trim();
    const acctNum = (searchParams.get("account") ?? "").trim();
    const type    = (searchParams.get("type")    ?? "").trim().toUpperCase();

    const count = await db.journalEntry.count();
    if (count === 0) return NextResponse.json({ entries: [], total: 0, page, pageSize: PAGE_SIZE });

    // Build WHERE clauses — all values interpolated safely via LIKE patterns
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
    const offset = (page - 1) * PAGE_SIZE;

    // Count matching rows
    const [{ total }] = await db.$queryRawUnsafe<{ total: string }[]>(
      `SELECT COUNT(*)::TEXT AS total
         FROM journal_entries je
         JOIN accounts a ON je.account_id = a.id
         ${where}`,
      ...binds
    );

    // Paginated entries
    const rows = await db.$queryRawUnsafe<Row[]>(
      `SELECT
         je.id,
         TO_CHAR(je.date, 'YYYY-MM-DD')  AS date,
         a.account_number,
         a.name                           AS account_name,
         a.type::TEXT                     AS account_type,
         je.description,
         ROUND(je.debit,  2)::TEXT        AS debit,
         ROUND(je.credit, 2)::TEXT        AS credit
       FROM journal_entries je
       JOIN accounts a ON je.account_id = a.id
       ${where}
       ORDER BY je.date, a.account_number, je.id
       LIMIT ${PAGE_SIZE} OFFSET ${offset}`,
      ...binds
    );

    return NextResponse.json({
      entries: rows.map((r) => ({
        id:            r.id,
        date:          r.date,
        accountNumber: r.account_number,
        accountName:   r.account_name,
        accountType:   r.account_type,
        description:   r.description,
        debit:         parseFloat(r.debit),
        credit:        parseFloat(r.credit),
      })),
      total: parseInt(total, 10),
      page,
      pageSize: PAGE_SIZE,
    });
  } catch (error) {
    console.error("Ledger API error:", error);
    return NextResponse.json({ error: "Failed to load ledger data" }, { status: 500 });
  }
}
