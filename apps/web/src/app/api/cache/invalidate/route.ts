import { NextResponse } from "next/server";
import { cacheInvalidate } from "@/lib/redis";

export const dynamic = "force-dynamic";

/**
 * POST /api/cache/invalidate
 * Deletes all cached dashboard responses.
 * Called automatically by the upload status route when an upload completes.
 */
export async function POST() {
  await cacheInvalidate("dashboard:*");
  return NextResponse.json({ ok: true });
}
