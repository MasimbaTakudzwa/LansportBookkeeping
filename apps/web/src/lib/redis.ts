/**
 * Redis client singleton with graceful degradation.
 * If Redis is unavailable, all cache operations silently no-op.
 * Cache is invalidated on each successful workbook upload.
 */
import Redis from "ioredis";

let client: Redis | null = null;

function getClient(): Redis | null {
  if (typeof window !== "undefined") return null; // never run on client
  if (!process.env.REDIS_URL) return null;

  if (!client) {
    try {
      client = new Redis(process.env.REDIS_URL, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        connectTimeout: 2000,
        commandTimeout: 1000,
        enableOfflineQueue: false,
      });
      client.on("error", () => {
        // Silently degrade — app still works without cache
      });
    } catch {
      client = null;
    }
  }
  return client;
}

export async function cacheGet(key: string): Promise<string | null> {
  try {
    return (await getClient()?.get(key)) ?? null;
  } catch {
    return null;
  }
}

export async function cacheSet(
  key: string,
  value: string,
  ttlSeconds = 300
): Promise<void> {
  try {
    await getClient()?.setex(key, ttlSeconds, value);
  } catch {
    // silent degrade
  }
}

/** Delete all keys matching a glob pattern (e.g. "dashboard:*"). */
export async function cacheInvalidate(pattern: string): Promise<void> {
  try {
    const r = getClient();
    if (!r) return;
    const keys = await r.keys(pattern);
    if (keys.length > 0) await r.del(...keys);
  } catch {
    // silent degrade
  }
}
