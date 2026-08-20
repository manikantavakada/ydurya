import { PrismaClient } from '@prisma/client';

/**
 * Single Prisma instance. In dev the module graph is re-evaluated on every
 * hot reload, so the client is parked on globalThis to avoid exhausting the
 * MySQL connection pool — which matters on shared Hostinger MySQL.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
