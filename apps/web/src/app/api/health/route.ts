import { NextResponse } from "next/server";
import { db }           from "@/lib/db";
import { cacheGet }     from "@/lib/redis";

export async function GET() {
  const checks: Record<string, "ok" | "error"> = {
    db:    "ok",
    redis: "ok",
  };

  // PostgreSQL probe
  try {
    await db.$queryRaw`SELECT 1`;
  } catch {
    checks.db = "error";
  }

  // Redis probe (graceful — Redis may not be running in dev)
  try {
    await cacheGet("health:ping");
  } catch {
    checks.redis = "error";
  }

  const allOk = Object.values(checks).every((v) => v === "ok");

  return NextResponse.json(
    {
      status:    allOk ? "ok" : "degraded",
      service:   "lansport-analytics-web",
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: allOk ? 200 : 503 }
  );
}
