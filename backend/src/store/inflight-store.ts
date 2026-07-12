import { getRedisClient, getStorageMode } from '../lib/redis.js';

// Deduplicates concurrent identical analyze requests: the first request claims the
// analysisKey, later ones are handed the same jobId until the claim is released
// (or the safety TTL expires — e.g. after a worker crash).
const INFLIGHT_PREFIX = 'inflight:analysis:';
const INFLIGHT_TTL_SECONDS = 300;
const INFLIGHT_TTL_MS = INFLIGHT_TTL_SECONDS * 1000;

const memoryInflight = new Map<string, { jobId: string; expiresAt: number }>();

/**
 * Try to claim an analysis key for jobId. Returns null when the claim succeeded,
 * or the jobId already processing that key.
 */
export async function claimInflight(analysisKey: string, jobId: string): Promise<string | null> {
  const client = getStorageMode() === 'redis' ? getRedisClient() : null;
  if (client) {
    const key = `${INFLIGHT_PREFIX}${analysisKey}`;
    const claimed = await client.set(key, jobId, 'EX', INFLIGHT_TTL_SECONDS, 'NX');
    if (claimed === 'OK') {
      return null;
    }
    return client.get(key);
  }

  const existing = memoryInflight.get(analysisKey);
  if (existing && existing.expiresAt > Date.now()) {
    return existing.jobId;
  }
  memoryInflight.set(analysisKey, { jobId, expiresAt: Date.now() + INFLIGHT_TTL_MS });
  return null;
}

export async function releaseInflight(analysisKey: string): Promise<void> {
  const client = getStorageMode() === 'redis' ? getRedisClient() : null;
  if (client) {
    await client.del(`${INFLIGHT_PREFIX}${analysisKey}`);
    return;
  }
  memoryInflight.delete(analysisKey);
}
