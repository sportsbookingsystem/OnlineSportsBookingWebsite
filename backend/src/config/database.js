/**
 * Database connection (Prisma)
 *
 * Prisma reads DATABASE_URL from process.env (loaded in index.js via dotenv).
 * This file exports a single PrismaClient instance (singleton) so the app
 * does not create multiple connection pools during development hot-reload.
 */
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
