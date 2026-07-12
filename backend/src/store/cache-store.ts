import { getRedisClient, getStorageMode } from '../lib/redis.js';
import type { AnalysisResult, ChannelSnapshot } from '../types/analysis.js';

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const channelCache = new Map<string, CacheEntry<ChannelSnapshot>>();
const analysisCache = new Map<string, CacheEntry<AnalysisResult>>();
const CHANNEL_CACHE_PREFIX = 'cache:channel:';
const ANALYSIS_CACHE_PREFIX = 'cache:analysis:';
const CACHE_TTL_SECONDS = 24 * 60 * 60;
const CACHE_TTL_MS = CACHE_TTL_SECONDS * 1000;
// Bound the in-memory maps; entries for keys that are never requested again
// would otherwise live for the process lifetime.
const MAX_MEMORY_ENTRIES = 100;

function setCache<T>(store: Map<string, CacheEntry<T>>, key: string, value: T): void {
  store.delete(key);
  while (store.size >= MAX_MEMORY_ENTRIES) {
    const oldestKey = store.keys().next().value;
    if (oldestKey === undefined) {
      break;
    }
    store.delete(oldestKey);
  }
  store.set(key, {
    value,
    expiresAt: Date.now() + CACHE_TTL_MS
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

async function getRedisValue<T>(key: string): Promise<T | null> {
  const client = getStorageMode() === 'redis' ? getRedisClient() : null;
  if (!client) {
    return null;
  }
  const raw = await client.get(key);
  if (!raw) {
    return null;
  }
  return JSON.parse(raw) as T;
}

async function setRedisValue(key: string, value: unknown): Promise<boolean> {
  const client = getStorageMode() === 'redis' ? getRedisClient() : null;
  if (!client) {
    return false;
  }
  await client.set(key, JSON.stringify(value), 'EX', CACHE_TTL_SECONDS);
  return true;
}

export async function getCachedChannelSnapshot(key: string): Promise<ChannelSnapshot | null> {
  if (getStorageMode() === 'redis') {
    return getRedisValue<ChannelSnapshot>(`${CHANNEL_CACHE_PREFIX}${key}`);
  }
  return getCache(channelCache, key);
}

export async function cacheChannelSnapshot(key: string, value: ChannelSnapshot): Promise<void> {
  if (await setRedisValue(`${CHANNEL_CACHE_PREFIX}${key}`, value)) {
    return;
  }
  setCache(channelCache, key, value);
}

export async function getCachedAnalysis(key: string): Promise<AnalysisResult | null> {
  if (getStorageMode() === 'redis') {
    return getRedisValue<AnalysisResult>(`${ANALYSIS_CACHE_PREFIX}${key}`);
  }
  return getCache(analysisCache, key);
}

export async function cacheAnalysis(key: string, value: AnalysisResult): Promise<void> {
  if (await setRedisValue(`${ANALYSIS_CACHE_PREFIX}${key}`, value)) {
    return;
  }
  setCache(analysisCache, key, value);
}
