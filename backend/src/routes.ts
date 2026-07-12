import { randomUUID } from 'node:crypto';

import type { Express } from 'express';
import { z } from 'zod';

import { env } from './config/env.js';
import { getPrismaClient } from './lib/prisma.js';
import { enqueueAnalysisJob } from './store/analysis-queue.js';
import { buildAnalysisKey, getCachedAnalysis } from './store/cache-store.js';
import { createJob, getJob, updateJobStatus } from './store/job-store.js';
import { normalizeChannelUrl } from './utils/channel.js';

const analyzeInputSchema = z.object({
  channelUrl: z.string().url('Please provide a valid channel URL'),
  maxVideos: z.number().int().min(5).max(50).default(15)
});

export function registerRoutes(app: Express): void {
  const prisma = getPrismaClient();

  app.get('/api/health', (_request, response) => {
    response.json({
      status: 'ok',
      prisma: prisma ? 'configured' : 'not_configured',
      youtube: env.YOUTUBE_API_KEY ? 'configured' : 'demo_mode',
      redis: env.REDIS_URL ? 'configured' : 'in_memory_mode',
      llm: env.LLM_API_KEY ? 'configured' : 'heuristic_mode',
      now: new Date().toISOString()
    });
  });

  app.post('/api/analyze-channel', async (request, response) => {
    const parsed = analyzeInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return response.status(400).json({
        message: 'Invalid request body',
        issues: parsed.error.issues
      });
    }

    const normalizedChannelUrl = normalizeChannelUrl(parsed.data.channelUrl);
    const analysisKey = buildAnalysisKey(normalizedChannelUrl, parsed.data.maxVideos);
    const jobId = randomUUID();
    await createJob(jobId, normalizedChannelUrl);

    const cachedResult = await getCachedAnalysis(analysisKey);
    if (cachedResult) {
      await updateJobStatus(jobId, 'completed', { result: cachedResult });
      return response.status(202).json({
        jobId,
        status: 'completed'
      });
    }

    await enqueueAnalysisJob({
      jobId,
      channelUrl: normalizedChannelUrl,
      maxVideos: parsed.data.maxVideos,
      analysisKey
    });

    return response.status(202).json({
      jobId,
      status: 'queued'
    });
  });

  app.get('/api/analysis/:jobId', async (request, response) => {
    const paramsSchema = z.object({ jobId: z.string().min(1) });
    const params = paramsSchema.safeParse(request.params);
    if (!params.success) {
      return response.status(400).json({ message: 'Invalid job id' });
    }

    const job = await getJob(params.data.jobId);
    if (!job) {
      return response.status(404).json({ message: 'Analysis job not found' });
    }

    return response.json(job);
  });

  app.get('/api/analysis-by-channel', async (request, response) => {
    const querySchema = z.object({
      channelUrl: z.string().url()
    });
    const parsed = querySchema.safeParse(request.query);
    if (!parsed.success) {
      return response
        .status(400)
        .json({ message: 'channelUrl query param is required and must be a valid URL' });
    }

    if (!prisma) {
      return response.status(503).json({ message: 'DATABASE_URL is not configured' });
    }

    const channelUrl = normalizeChannelUrl(parsed.data.channelUrl);
    const channel = await prisma.channel.findUnique({
      where: { url: channelUrl },
      include: {
        analyses: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 1
        }
      }
    });

    const latest = channel?.analyses?.[0];
    if (!latest?.resultJson) {
      return response.status(404).json({ message: 'No analysis found for channel' });
    }

    return response.json({
      channelUrl,
      analysisId: latest.id,
      status: latest.status,
      createdAt: latest.createdAt,
      completedAt: latest.completedAt,
      result: latest.resultJson
    });
  });
}
