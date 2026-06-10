import type { AnalysisResult, ChannelSnapshot } from '../types/analysis.js';

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const channelCache = new Map<string, CacheEntry<ChannelSnapshot>>();
const analysisCache = new Map<string, CacheEntry<AnalysisResult>>();

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

export function getCachedChannelSnapshot(key: string): ChannelSnapshot | null {
  return getCache(channelCache, key);
}

export function cacheChannelSnapshot(key: string, value: ChannelSnapshot): void {
  setCache(channelCache, key, value, 24 * 60 * 60 * 1000);
}

export function getCachedAnalysis(key: string): AnalysisResult | null {
  return getCache(analysisCache, key);
}

export function cacheAnalysis(key: string, value: AnalysisResult): void {
  setCache(analysisCache, key, value, 24 * 60 * 60 * 1000);
}
