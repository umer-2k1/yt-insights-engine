import type { AnalysisResult, ChannelSnapshot } from '../types/analysis.js';
import { ensureRedisConnection, getRedisClient } from '../lib/redis.js';

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const channelCache = new Map<string, CacheEntry<ChannelSnapshot>>();
const analysisCache = new Map<string, CacheEntry<AnalysisResult>>();
const CHANNEL_CACHE_PREFIX = 'cache:channel:';
const ANALYSIS_CACHE_PREFIX = 'cache:analysis:';

function setCache<T>(store: Map<string, CacheEntry<T>>, key: string, value: T, ttlMs: number): void {
  store.set(key, {
    value,
    expiresAt: Date.now() + ttlMs
  });
}

function getCache<T>(store: Map<string, CacheEntry<T>>, key: string): T | null {
  const entry = store.get(key);
  if (!entry) {
    return null;
  }
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

export function buildAnalysisKey(channelUrl: string, maxVideos: number): string {
  return `${channelUrl}::${maxVideos}`;
}

function channelCacheKey(key: string): string {
  return `${CHANNEL_CACHE_PREFIX}${key}`;
}

function analysisCacheKey(key: string): string {
  return `${ANALYSIS_CACHE_PREFIX}${key}`;
}

export async function getCachedChannelSnapshot(key: string): Promise<ChannelSnapshot | null> {
  const redisReady = await ensureRedisConnection();
  if (redisReady) {
    const client = getRedisClient();
    if (client) {
      const raw = await client.get(channelCacheKey(key));
      if (!raw) {
        return null;
      }
      return JSON.parse(raw) as ChannelSnapshot;
    }
  }

  return getCache(channelCache, key);
}

export async function cacheChannelSnapshot(key: string, value: ChannelSnapshot): Promise<void> {
  const redisReady = await ensureRedisConnection();
  if (redisReady) {
    const client = getRedisClient();
    if (client) {
      await client.set(channelCacheKey(key), JSON.stringify(value), 'EX', 24 * 60 * 60);
      return;
    }
  }

  setCache(channelCache, key, value, 24 * 60 * 60 * 1000);
}

export async function getCachedAnalysis(key: string): Promise<AnalysisResult | null> {
  const redisReady = await ensureRedisConnection();
  if (redisReady) {
    const client = getRedisClient();
    if (client) {
      const raw = await client.get(analysisCacheKey(key));
      if (!raw) {
        return null;
      }
      return JSON.parse(raw) as AnalysisResult;
    }
  }

  return getCache(analysisCache, key);
}

export async function cacheAnalysis(key: string, value: AnalysisResult): Promise<void> {
  const redisReady = await ensureRedisConnection();
  if (redisReady) {
    const client = getRedisClient();
    if (client) {
      await client.set(analysisCacheKey(key), JSON.stringify(value), 'EX', 24 * 60 * 60);
      return;
    }
  }

  setCache(analysisCache, key, value, 24 * 60 * 60 * 1000);
}
