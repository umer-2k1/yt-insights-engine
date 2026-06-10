import type { AnalysisJob, AnalysisJobStatus, AnalysisResult } from '../types/analysis.js';

const jobs = new Map<string, AnalysisJob>();

export function createJob(jobId: string, channelUrl: string): AnalysisJob {
  const now = new Date().toISOString();
  const job: AnalysisJob = {
    jobId,
    channelUrl,
    status: 'queued',
    createdAt: now,
    updatedAt: now
  };

  jobs.set(jobId, job);
  return job;
}

export function getJob(jobId: string): AnalysisJob | undefined {
  return jobs.get(jobId);
}

export function updateJobStatus(
  jobId: string,
  status: AnalysisJobStatus,
  options?: { error?: string; result?: AnalysisResult }
): AnalysisJob | undefined {
  const existing = jobs.get(jobId);
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

  jobs.set(jobId, next);
  return next;
}
