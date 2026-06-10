import { ensureRedisConnection, getRedisClient } from '../lib/redis.js';

type QueuePayload = {
  jobId: string;
  channelUrl: string;
  maxVideos: number;
  analysisKey: string;
};

const REDIS_QUEUE_KEY = 'queue:analysis:jobs';
const memoryQueue: QueuePayload[] = [];
let memoryWorkerActive = false;

function parsePayload(raw: string): QueuePayload | null {
  try {
    return JSON.parse(raw) as QueuePayload;
  } catch {
    return null;
  }
}

export async function enqueueAnalysisJob(payload: QueuePayload): Promise<void> {
  const redisReady = await ensureRedisConnection();
  if (redisReady) {
    const client = getRedisClient();
    if (client) {
      await client.lpush(REDIS_QUEUE_KEY, JSON.stringify(payload));
      return;
    }
  }

  memoryQueue.push(payload);
}

async function popRedisQueue(): Promise<QueuePayload | null> {
  const redisReady = await ensureRedisConnection();
  if (!redisReady) {
    return null;
  }

  const client = getRedisClient();
  if (!client) {
    return null;
  }

  const item = await client.rpop(REDIS_QUEUE_KEY);
  if (!item) {
    return null;
  }
  return parsePayload(item);
}

function popMemoryQueue(): QueuePayload | null {
  return memoryQueue.shift() ?? null;
}

export function startAnalysisWorker(
  worker: (payload: QueuePayload) => Promise<void>,
  options?: { intervalMs?: number }
): void {
  if (memoryWorkerActive) {
    return;
  }
  memoryWorkerActive = true;

  const intervalMs = options?.intervalMs ?? 1000;

  const run = async (): Promise<void> => {
    if (!memoryWorkerActive) {
      return;
    }

    try {
      const redisJob = await popRedisQueue();
      if (redisJob) {
        await worker(redisJob);
      } else {
        const memoryJob = popMemoryQueue();
        if (memoryJob) {
          await worker(memoryJob);
        }
      }
    } catch {
      // Keep queue worker resilient; retry in next tick.
    } finally {
      setTimeout(() => {
        void run();
      }, intervalMs);
    }
  };

  void run();
}
