import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { getRedisClient, getStorageMode } from '../lib/redis.js';
import { updateJobStatus } from './job-store.js';

type QueuePayload = {
  jobId: string;
  channelUrl: string;
  maxVideos: number;
  analysisKey: string;
};

const REDIS_QUEUE_KEY = 'queue:analysis:jobs';
const memoryQueue: QueuePayload[] = [];
let workerActive = false;
let pendingTick: NodeJS.Timeout | null = null;

export async function enqueueAnalysisJob(payload: QueuePayload): Promise<void> {
  const client = getStorageMode() === 'redis' ? getRedisClient() : null;
  if (client) {
    await client.lpush(REDIS_QUEUE_KEY, JSON.stringify(payload));
    return;
  }

  memoryQueue.push(payload);
}

async function popQueue(): Promise<QueuePayload | null> {
  const client = getStorageMode() === 'redis' ? getRedisClient() : null;
  if (client) {
    const item = await client.rpop(REDIS_QUEUE_KEY);
    if (!item) {
      return null;
    }
    try {
      return JSON.parse(item) as QueuePayload;
    } catch {
      logger.error({ item }, 'discarding malformed queue payload');
      return null;
    }
  }

  return memoryQueue.shift() ?? null;
}

async function runWithTimeout(
  worker: (payload: QueuePayload) => Promise<void>,
  payload: QueuePayload
): Promise<void> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<'timeout'>((resolve) => {
    timer = setTimeout(() => {
      resolve('timeout');
    }, env.JOB_TIMEOUT_MS);
  });

  const outcome = await Promise.race([worker(payload).then(() => 'done' as const), timeout]);
  clearTimeout(timer);

  if (outcome === 'timeout') {
    logger.error({ jobId: payload.jobId }, 'analysis job timed out');
    await updateJobStatus(payload.jobId, 'failed', {
      error: `Analysis timed out after ${Math.round(env.JOB_TIMEOUT_MS / 1000)}s`
    });
  }
}

export function startAnalysisWorker(
  worker: (payload: QueuePayload) => Promise<void>,
  options?: { intervalMs?: number }
): void {
  if (workerActive) {
    return;
  }
  workerActive = true;

  const baseIntervalMs = options?.intervalMs ?? 1000;
  const maxIdleIntervalMs = 5000;
  let idleIntervalMs = baseIntervalMs;

  const run = async (): Promise<void> => {
    if (!workerActive) {
      return;
    }

    let processed = false;
    try {
      const payload = await popQueue();
      if (payload) {
        processed = true;
        await runWithTimeout(worker, payload);
      }
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : error },
        'queue worker tick failed'
      );
    } finally {
      // Drain the queue back-to-back when busy; back off up to 5s when idle.
      idleIntervalMs = processed ? baseIntervalMs : Math.min(idleIntervalMs * 2, maxIdleIntervalMs);
      if (workerActive) {
        pendingTick = setTimeout(
          () => {
            void run();
          },
          processed ? 0 : idleIntervalMs
        );
      }
    }
  };

  void run();
}

export function stopAnalysisWorker(): void {
  workerActive = false;
  if (pendingTick) {
    clearTimeout(pendingTick);
    pendingTick = null;
  }
}
