import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cacheInvalidate } from "@/lib/redis";

export async function GET(
  _req: NextRequest,
  { params }: { params: { checksum: string } }
) {
  const upload = await db.uploadHistory.findUnique({
    where: { checksum: params.checksum },
    select: {
      status: true,
      rowCount: true,
      errorMessage: true,
      uploadedAt: true,
      filename: true,
    },
  });

  if (!upload) {
    return NextResponse.json({ status: "not_found" }, { status: 404 });
  }

  // Invalidate dashboard cache when upload finishes so next page load
  // gets fresh data without waiting for TTL expiry.
  if (upload.status === "complete" || upload.status === "error") {
    await cacheInvalidate("dashboard:*");
  }

  return NextResponse.json(upload);
}
