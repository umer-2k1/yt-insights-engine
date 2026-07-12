import { getRedisClient, getStorageMode } from '../lib/redis.js';
import type { AnalysisJob, AnalysisJobStatus, AnalysisResult } from '../types/analysis.js';

const jobs = new Map<string, AnalysisJob>();
const JOB_KEY_PREFIX = 'job:analysis:';
const JOB_TTL_SECONDS = 24 * 60 * 60;
const JOB_TTL_MS = JOB_TTL_SECONDS * 1000;

function buildKey(jobId: string): string {
  return `${JOB_KEY_PREFIX}${jobId}`;
}

// The in-memory map has no TTL support; sweep expired entries on write so a
// long-lived keyless deployment does not leak completed jobs.
function evictExpiredJobs(): void {
  const cutoff = Date.now() - JOB_TTL_MS;
  for (const [jobId, job] of jobs) {
    if (new Date(job.createdAt).getTime() < cutoff) {
      jobs.delete(jobId);
    }
  }
}

async function saveJob(job: AnalysisJob): Promise<void> {
  const client = getStorageMode() === 'redis' ? getRedisClient() : null;
  if (client) {
    await client.set(buildKey(job.jobId), JSON.stringify(job), 'EX', JOB_TTL_SECONDS);
    return;
  }

  evictExpiredJobs();
  jobs.set(job.jobId, job);
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

  await saveJob(job);
  return job;
}

export async function getJob(jobId: string): Promise<AnalysisJob | undefined> {
  const client = getStorageMode() === 'redis' ? getRedisClient() : null;
  if (client) {
    const raw = await client.get(buildKey(jobId));
    if (!raw) {
      return undefined;
    }
    return JSON.parse(raw) as AnalysisJob;
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

  // Single writer (the one worker) owns these fields after creation; merge so a
  // status-only update never clobbers a previously stored result or error.
  const next: AnalysisJob = {
    ...existing,
    status,
    error: options?.error ?? existing.error,
    result: options?.result ?? existing.result,
    updatedAt: new Date().toISOString()
  };

  await saveJob(next);
  return next;
}
