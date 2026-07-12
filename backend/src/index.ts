import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { getPrismaClient } from './lib/prisma.js';
import { getRedisClient } from './lib/redis.js';
import { startAnalysisWorker, stopAnalysisWorker } from './store/analysis-queue.js';
import { processAnalysis } from './worker.js';

const app = createApp();

startAnalysisWorker(processAnalysis);

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, 'YT Insight Engine backend running');
});

let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  logger.info({ signal }, 'shutting down');

  stopAnalysisWorker();
  server.close();

  try {
    await getPrismaClient()?.$disconnect();
  } catch (error) {
    logger.warn({ error }, 'prisma disconnect failed');
  }

  try {
    await getRedisClient()?.quit();
  } catch (error) {
    logger.warn({ error }, 'redis quit failed');
  }

  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
