import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.name.endsWith(".xlsx")) {
      return NextResponse.json(
        { error: "Only .xlsx files are supported" },
        { status: 400 }
      );
    }

    // Read bytes and compute SHA-256 checksum for deduplication
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const checksum = crypto.createHash("sha256").update(buffer).digest("hex");

    // Ensure uploads directory exists
    const uploadDir = process.env.UPLOAD_DIR ?? join(process.cwd(), "uploads");
    await mkdir(uploadDir, { recursive: true });

    // Save with checksum prefix to prevent filename collisions
    const filename = `${checksum.slice(0, 8)}_${file.name}`;
    const filePath = join(uploadDir, filename);
    await writeFile(filePath, buffer);

    // Trigger ETL processing asynchronously
    const etlUrl = process.env.ETL_SERVICE_URL ?? "http://etl:8000";
    const etlResponse = await fetch(`${etlUrl}/process`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file_path: filePath, checksum }),
    });

    if (!etlResponse.ok) {
      const detail = await etlResponse.text();
      return NextResponse.json(
        { error: "ETL service returned an error", detail },
        { status: 502 }
      );
    }

    const etlResult = await etlResponse.json();

    // Return the full checksum so the client can poll /api/upload/status/[checksum]
    return NextResponse.json({
      success: true,
      filename,
      checksum,          // full SHA-256 — used for status polling
      etl: etlResult,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
