import { randomUUID } from 'node:crypto';

import cors from 'cors';
import express from 'express';
import { z } from 'zod';

import { env } from './config/env.js';
import { getPrismaClient } from './lib/prisma.js';
import { runAnalysis } from './services/analysis-engine.js';
import { fetchChannelSnapshot } from './services/youtube-service.js';
import { createJob, getJob, updateJobStatus } from './store/job-store.js';
import { normalizeChannelUrl } from './utils/channel.js';

const app = express();
const prisma = getPrismaClient();

app.use(
  cors({
    origin: env.FRONTEND_ORIGIN
  })
);
app.use(express.json());

const analyzeInputSchema = z.object({
  channelUrl: z.string().url('Please provide a valid channel URL'),
  maxVideos: z.number().int().min(5).max(50).default(15)
});

app.get('/api/health', (_request, response) => {
  response.json({
    status: 'ok',
    prisma: prisma ? 'configured' : 'not_configured',
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
  const jobId = randomUUID();
  createJob(jobId, normalizedChannelUrl);

  void processAnalysis(jobId, normalizedChannelUrl, parsed.data.maxVideos);

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

  const job = getJob(params.data.jobId);
  if (!job) {
    return response.status(404).json({ message: 'Analysis job not found' });
  }

  return response.json(job);
});

async function processAnalysis(jobId: string, channelUrl: string, maxVideos: number): Promise<void> {
  try {
    updateJobStatus(jobId, 'running');
    const snapshot = await fetchChannelSnapshot({ channelUrl, maxVideos });
    const result = await runAnalysis(snapshot);

    if (prisma) {
      const channel = await prisma.channel.upsert({
        where: { url: channelUrl },
        update: {
          title: result.channel.title,
          nicheLabel: result.channel.niche
        },
        create: {
          url: channelUrl,
          title: result.channel.title,
          nicheLabel: result.channel.niche
        }
      });

      await prisma.analysis.create({
        data: {
          channelId: channel.id,
          status: 'completed',
          inputConfig: {
            channelUrl,
            maxVideos
          },
          resultJson: result,
          completedAt: new Date()
        }
      });
    }

    updateJobStatus(jobId, 'completed', { result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown analysis failure';
    updateJobStatus(jobId, 'failed', { error: message });
  }
}

app.listen(env.PORT, () => {
  console.log(`YT Insight Engine backend running at http://localhost:${env.PORT}`);
});
