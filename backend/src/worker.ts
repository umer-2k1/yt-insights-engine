import { logger } from './lib/logger.js';
import { getPrismaClient } from './lib/prisma.js';
import { persistAnalysis } from './services/analysis-repository.js';
import { runAnalysis } from './services/analysis-engine.js';
import { applyLlmRecommendationLayer } from './services/llm-scoring-service.js';
import { fetchChannelSnapshot } from './services/youtube-service.js';
import {
  cacheAnalysis,
  cacheChannelSnapshot,
  getCachedChannelSnapshot
} from './store/cache-store.js';
import { releaseInflight } from './store/inflight-store.js';
import { updateJobStatus } from './store/job-store.js';

export type AnalysisJobPayload = {
  jobId: string;
  channelUrl: string;
  maxVideos: number;
  analysisKey: string;
};

export async function processAnalysis(payload: AnalysisJobPayload): Promise<void> {
  const { jobId, channelUrl, maxVideos, analysisKey } = payload;
  const prisma = getPrismaClient();

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
      await persistAnalysis({ prisma, snapshot, result, channelUrl, maxVideos });
    }

    await updateJobStatus(jobId, 'completed', { result });
    logger.info({ jobId, channelUrl }, 'analysis completed');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown analysis failure';
    logger.error({ jobId, channelUrl, error: message }, 'analysis failed');
    await updateJobStatus(jobId, 'failed', { error: message });
  } finally {
    await releaseInflight(analysisKey);
  }
}
