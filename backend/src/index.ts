import { randomUUID } from 'node:crypto';

import cors from 'cors';
import express from 'express';
import { z } from 'zod';

import { env } from './config/env.js';
import { getPrismaClient } from './lib/prisma.js';
import { runAnalysis } from './services/analysis-engine.js';
import { applyLlmRecommendationLayer } from './services/llm-scoring-service.js';
import { fetchChannelSnapshot } from './services/youtube-service.js';
import {
  buildAnalysisKey,
  cacheAnalysis,
  cacheChannelSnapshot,
  getCachedAnalysis,
  getCachedChannelSnapshot
} from './store/cache-store.js';
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
    youtube: env.YOUTUBE_API_KEY ? 'configured' : 'fallback_mode',
    redis: env.REDIS_URL ? 'configured' : 'in_memory_mode',
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

  void processAnalysis(jobId, normalizedChannelUrl, parsed.data.maxVideos, analysisKey);

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
    return response.status(400).json({ message: 'channelUrl query param is required and must be a valid URL' });
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

async function processAnalysis(
  jobId: string,
  channelUrl: string,
  maxVideos: number,
  analysisKey: string
): Promise<void> {
  try {
    await updateJobStatus(jobId, 'running');
    const cachedSnapshot = await getCachedChannelSnapshot(analysisKey);
    const snapshot = cachedSnapshot ?? (await fetchChannelSnapshot({ channelUrl, maxVideos }));
    if (!cachedSnapshot) {
      await cacheChannelSnapshot(analysisKey, snapshot);
    }
    const baseResult = await runAnalysis(snapshot);
    const result = await applyLlmRecommendationLayer(snapshot, baseResult);
    await cacheAnalysis(analysisKey, result);

    if (prisma) {
      const channel = await prisma.channel.upsert({
        where: { url: channelUrl },
        update: {
          title: result.channel.title,
          nicheLabel: result.channel.niche,
          youtubeChannelId: snapshot.channelId
        },
        create: {
          url: channelUrl,
          title: result.channel.title,
          nicheLabel: result.channel.niche,
          youtubeChannelId: snapshot.channelId
        }
      });

      await prisma.video.deleteMany({
        where: {
          channelId: channel.id
        }
      });

      for (const video of snapshot.videos) {
        const savedVideo = await prisma.video.create({
          data: {
            channelId: channel.id,
            youtubeVideoId: video.videoId,
            title: video.title,
            description: video.description,
            publishedAt: new Date(video.publishedAt)
          }
        });

        await prisma.videoMetric.create({
          data: {
            videoId: savedVideo.id,
            viewCount: video.views,
            likeCount: video.likes,
            commentCount: video.commentsCount,
            velocityScore:
              video.views /
              Math.max(
                1,
                Math.floor(
                  (Date.now() - new Date(video.publishedAt).getTime()) / (1000 * 60 * 60 * 24)
                )
              )
          }
        });

        if (video.transcriptSnippet) {
          await prisma.transcript.create({
            data: {
              videoId: savedVideo.id,
              source: env.YOUTUBE_API_KEY ? 'youtube_api_context' : 'fallback_generated',
              language: 'en',
              transcriptText: video.transcriptSnippet,
              isAutoGenerated: true
            }
          });
        }

        for (const comment of video.sampleComments) {
          await prisma.comment.create({
            data: {
              videoId: savedVideo.id,
              text: comment
            }
          });
        }
      }

      await prisma.analysis.create({
        data: {
          channelId: channel.id,
          status: 'completed',
          inputConfig: {
            channelUrl,
            maxVideos,
            mode: env.YOUTUBE_API_KEY ? 'youtube_api' : 'fallback'
          },
          resultJson: result,
          completedAt: new Date()
        }
      });
    }

    await updateJobStatus(jobId, 'completed', { result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown analysis failure';
    await updateJobStatus(jobId, 'failed', { error: message });
  }
}

app.listen(env.PORT, () => {
  console.log(`YT Insight Engine backend running at http://localhost:${env.PORT}`);
});
