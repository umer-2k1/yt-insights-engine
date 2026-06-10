import { PrismaClient } from '@prisma/client';

import { env } from '../config/env.js';

let prismaClient: PrismaClient | null = null;

export function getPrismaClient(): PrismaClient | null {
  if (!env.DATABASE_URL) {
    return null;
  }

  if (!prismaClient) {
    prismaClient = new PrismaClient();
  }

  return prismaClient;
}
