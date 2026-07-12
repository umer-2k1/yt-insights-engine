import { Redis } from 'ioredis';

import { env } from '../config/env.js';

let redisClient: Redis | null = null;

export function getRedisClient(): Redis | null {
  if (!env.REDIS_URL) {
    return null;
  }

  if (!redisClient) {
    redisClient = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      lazyConnect: true
    });
  }

  return redisClient;
}

export async function ensureRedisConnection(): Promise<boolean> {
  const client = getRedisClient();
  if (!client) {
    return false;
  }

  if (client.status === 'ready' || client.status === 'connect') {
    return true;
  }

  try {
    await client.connect();
    return true;
  } catch {
    return false;
  }
}
