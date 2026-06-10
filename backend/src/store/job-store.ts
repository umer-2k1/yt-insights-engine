import type { AnalysisJob, AnalysisJobStatus, AnalysisResult } from '../types/analysis.js';
import { ensureRedisConnection, getRedisClient } from '../lib/redis.js';

const jobs = new Map<string, AnalysisJob>();
const JOB_KEY_PREFIX = 'job:analysis:';

function buildKey(jobId: string): string {
  return `${JOB_KEY_PREFIX}${jobId}`;
}

export async function createJob(jobId: string, channelUrl: string): Promise<AnalysisJob> {
  const now = new Date().toISOString();
  const job: AnalysisJob = {
    jobId,
    channelUrl,
    status: 'queued',
    createdAt: now,
    updatedAt: now
  };

  const redisReady = await ensureRedisConnection();
  if (redisReady) {
    const client = getRedisClient();
    if (client) {
      await client.set(buildKey(jobId), JSON.stringify(job), 'EX', 24 * 60 * 60);
      return job;
    }
  }

  jobs.set(jobId, job);
  return job;
}

export async function getJob(jobId: string): Promise<AnalysisJob | undefined> {
  const redisReady = await ensureRedisConnection();
  if (redisReady) {
    const client = getRedisClient();
    if (client) {
      const raw = await client.get(buildKey(jobId));
      if (!raw) {
        return undefined;
      }
      return JSON.parse(raw) as AnalysisJob;
    }
  }

  return jobs.get(jobId);
}

export async function updateJobStatus(
  jobId: string,
  status: AnalysisJobStatus,
  options?: { error?: string; result?: AnalysisResult }
): Promise<AnalysisJob | undefined> {
  const existing = await getJob(jobId);
  if (!existing) {
    return undefined;
  }

  const next: AnalysisJob = {
    ...existing,
    status,
    error: options?.error,
    result: options?.result,
    updatedAt: new Date().toISOString()
  };

  const redisReady = await ensureRedisConnection();
  if (redisReady) {
    const client = getRedisClient();
    if (client) {
      await client.set(buildKey(jobId), JSON.stringify(next), 'EX', 24 * 60 * 60);
      return next;
    }
  }

  jobs.set(jobId, next);
  return next;
}
