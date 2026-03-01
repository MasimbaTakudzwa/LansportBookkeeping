import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await db.uploadHistory.findMany({
      orderBy: { uploadedAt: "desc" },
      select: {
        id:           true,
        filename:     true,
        checksum:     true,
        status:       true,
        rowCount:     true,
        errorMessage: true,
        uploadedAt:   true,
      },
    });

    return NextResponse.json(
      rows.map((r) => ({
        id:           r.id,
        filename:     r.filename,
        checksum:     r.checksum.slice(0, 12) + "…",  // truncated for display
        status:       r.status,
        rowCount:     r.rowCount,
        errorMessage: r.errorMessage,
        uploadedAt:   r.uploadedAt.toISOString(),
      }))
    );
  } catch (error) {
    console.error("Upload history error:", error);
    return NextResponse.json({ error: "Failed to load upload history" }, { status: 500 });
  }
}
