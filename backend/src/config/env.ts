import 'dotenv/config';

import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  FRONTEND_ORIGIN: z.string().default('http://localhost:3000'),
  REDIS_URL: z.string().optional(),
  DATABASE_URL: z.string().optional(),
  YOUTUBE_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional()
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  // Keep startup errors explicit for local setup.
  throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
}

export const env = parsed.data;
