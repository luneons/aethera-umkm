import { Redis } from "@upstash/redis";

/**
 * Upstash Redis client — server-side only (API routes).
 * Vercel injects these env vars when connected via Storage tab:
 *   KV_REST_API_URL  and  KV_REST_API_TOKEN
 */
export const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LicenseActivation {
  /** License key (full string) */
  key: string;
  /** Business/toko name embedded in license payload */
  name: string;
  /** Device ID sent by the client */
  deviceId: string;
  /** Client IP address (from request headers) */
  ip: string;
  /** Plan type */
  plan: string;
  /** Expiry — ISO string or "Lifetime" */
  expiry: string;
  /** When this activation was recorded */
  activatedAt: string;
  /** User-Agent of the browser/device */
  userAgent: string;
  [key: string]: unknown;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const KEY_PREFIX = "activation:";
const INDEX_KEY = "activations_index"; // sorted set: score=timestamp, member=key

/** Record a new license activation (or update existing). */
export async function recordActivation(data: LicenseActivation): Promise<void> {
  // Store activation detail as hash
  const hashKey = `${KEY_PREFIX}${data.key.slice(0, 32)}`;
  await redis.hset(hashKey, {
    key:         data.key,
    name:        data.name,
    deviceId:    data.deviceId,
    ip:          data.ip,
    plan:        data.plan,
    expiry:      data.expiry,
    activatedAt: data.activatedAt,
    userAgent:   data.userAgent,
  });
  // Keep sorted index for pagination
  await redis.zadd(INDEX_KEY, {
    score: Date.now(),
    member: hashKey,
  });
}

/** Get all activations sorted by most recent. */
export async function getAllActivations(limit = 100): Promise<LicenseActivation[]> {
  // Get most recent `limit` hash keys from sorted set (reversed)
  const hashKeys = await redis.zrange(INDEX_KEY, 0, limit - 1, { rev: true });
  if (!hashKeys || hashKeys.length === 0) return [];

  const results: LicenseActivation[] = [];
  for (const hk of hashKeys) {
    const data = await redis.hgetall<LicenseActivation>(hk as string);
    if (data) results.push(data);
  }
  return results;
}

/** Count total activations. */
export async function getActivationCount(): Promise<number> {
  return redis.zcard(INDEX_KEY);
}
