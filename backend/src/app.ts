import { randomUUID } from 'node:crypto';

import cors from 'cors';
import express from 'express';

import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { registerRoutes } from './routes.js';

export function createApp(): express.Express {
  const app = express();

  app.use(
    cors({
      origin: env.FRONTEND_ORIGIN
    })
  );
  app.use(express.json({ limit: '100kb' }));

  app.use((request, response, next) => {
    const requestId = randomUUID();
    response.locals.requestId = requestId;
    const startedAt = Date.now();
    response.on('finish', () => {
      logger.info({
        requestId,
        method: request.method,
        path: request.path,
        status: response.statusCode,
        durationMs: Date.now() - startedAt
      });
    });
    next();
  });

  registerRoutes(app);

  return app;
}
