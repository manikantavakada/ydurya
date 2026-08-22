import { PrismaClient } from '@prisma/client';

/**
 * Single Prisma instance. In dev the module graph is re-evaluated on every
 * hot reload, so the client is parked on globalThis to avoid exhausting the
 * MySQL connection pool — which matters on shared Hostinger MySQL.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const basePrisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = basePrisma;

/**
 * Shared Hostinger MySQL kills idle connections after 20s (`wait_timeout`),
 * far more aggressive than Prisma's connection pool expects. When a pooled
 * connection goes stale like that, the Rust query engine doesn't reconnect
 * gracefully — it panics ("timer has gone away"), which by Prisma's own
 * docs leaves that engine instance unrecoverable: a query that would
 * otherwise succeed keeps failing until the process restarts. One retry
 * clears it in practice (confirmed against production), and if it doesn't,
 * exiting lets the host's process supervisor replace this worker with a
 * fresh one rather than every request failing until someone notices.
 */
function isEnginePanic(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /panic|timer has gone away/i.test(message);
}

export const prisma = basePrisma.$extends({
  query: {
    async $allOperations({ args, query }) {
      try {
        return await query(args);
      } catch (err) {
        if (!isEnginePanic(err)) throw err;
        console.error('[prisma] query engine panic — retrying once', err);
        try {
          return await query(args);
        } catch (retryErr) {
          if (isEnginePanic(retryErr)) {
            console.error('[prisma] retry also panicked — exiting so the host restarts this worker', retryErr);
            setImmediate(() => process.exit(1));
          }
          throw retryErr;
        }
      }
    },
  },
}) as unknown as PrismaClient;
