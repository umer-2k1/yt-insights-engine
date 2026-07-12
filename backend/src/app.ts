import { randomUUID } from 'node:crypto';

import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { registerRoutes } from './routes.js';

export function createApp(): express.Express {
  const app = express();

  if (env.NODE_ENV === 'production') {
    // Rate limiting keys on req.ip; behind a reverse proxy that requires
    // trusting X-Forwarded-For from the first hop.
    app.set('trust proxy', 1);
  }

  app.use(helmet());
  app.use(
    cors({
      origin: env.FRONTEND_ORIGIN
    })
  );
  app.use(express.json({ limit: '100kb' }));
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      // Generous global ceiling; polling GET /api/analysis/:jobId every 2s
      // must never trip it during a normal session.
      limit: 600,
      standardHeaders: true,
      legacyHeaders: false
    })
  );

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
