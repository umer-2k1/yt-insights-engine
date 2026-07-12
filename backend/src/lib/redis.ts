import { Redis } from 'ioredis';

import { env } from '../config/env.js';
import { logger } from './logger.js';

export type StorageMode = 'redis' | 'memory';

let redisClient: Redis | null = null;
let storageMode: StorageMode = 'memory';

export function getRedisClient(): Redis | null {
  return redisClient;
}

export function getStorageMode(): StorageMode {
  return storageMode;
}

/**
 * Decide redis-vs-memory exactly once at startup. Deciding per operation lets a
 * flapping Redis split state across the job store, cache, and queue (a job created
 * in Redis but enqueued in memory is never processed).
 */
export async function initStorage(): Promise<StorageMode> {
  if (!env.REDIS_URL) {
    storageMode = 'memory';
    return storageMode;
  }

  const client = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 2,
    lazyConnect: true
  });

  const connectPromise = client.connect();
  // If the race below times out first, the losing rejection must not surface
  // as an unhandled rejection.
  connectPromise.catch(() => undefined);

  try {
    await Promise.race([
      connectPromise,
      new Promise((_resolve, reject) => {
        setTimeout(() => {
          reject(new Error('Redis connection timed out'));
        }, 2000);
      })
    ]);
    await client.ping();
    redisClient = client;
    storageMode = 'redis';
    logger.info('storage mode: redis');
  } catch (error) {
    client.disconnect();
    storageMode = 'memory';
    logger.warn(
      { error: error instanceof Error ? error.message : error },
      'redis unavailable at startup; storage mode: memory'
    );
  }

  return storageMode;
}
