import { createEnv } from '@t3-oss/env-core';
import z from 'zod';

const env = createEnv({
  clientPrefix: 'VITE_',
  client: {
    VITE_API_BASE_URL: z.url()
  },
  runtimeEnv: import.meta.env,
  emptyStringAsUndefined: true
});

export type Env = typeof env;
export default env;
