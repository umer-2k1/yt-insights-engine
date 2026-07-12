import { describe, expect, it } from 'vitest';

import type { AnalysisResult } from '../types/analysis.js';
import { createJob, getJob, updateJobStatus } from './job-store.js';

// Storage mode defaults to 'memory' when initStorage() has not run, so these
// tests exercise the in-memory path.

const fakeResult = { channel: { id: 'c', title: 't', url: 'u', niche: 'n' } } as AnalysisResult;

describe('job-store (memory mode)', () => {
  it('creates and reads back a queued job', async () => {
    const job = await createJob('job-1', 'https://www.youtube.com/@a');
    expect(job.status).toBe('queued');
    expect(await getJob('job-1')).toMatchObject({ jobId: 'job-1', status: 'queued' });
  });

  it('returns undefined for unknown jobs', async () => {
    expect(await getJob('missing')).toBeUndefined();
  });

  it('merges updates instead of clobbering result and error', async () => {
    await createJob('job-2', 'https://www.youtube.com/@b');
    await updateJobStatus('job-2', 'completed', { result: fakeResult });

    // A later status-only update must not erase the stored result.
    const updated = await updateJobStatus('job-2', 'completed');
    expect(updated?.result).toEqual(fakeResult);

    await updateJobStatus('job-2', 'failed', { error: 'boom' });
    const failed = await getJob('job-2');
    expect(failed?.error).toBe('boom');
    expect(failed?.result).toEqual(fakeResult);
  });

  it('returns undefined when updating a missing job', async () => {
    expect(await updateJobStatus('nope', 'running')).toBeUndefined();
  });
});
