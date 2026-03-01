import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

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

  return NextResponse.json(upload);
}
