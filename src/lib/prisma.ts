/**
 * Prisma Client singleton for Next.js.
 *
 * In development, Next.js hot-reloads modules which would create
 * multiple PrismaClient instances. This module caches the client
 * on `globalThis` to prevent connection exhaustion.
 *
 * Usage:  import { prisma } from "@/lib/prisma";
 */

import { PrismaClient } from "@prisma/client";
import { createTenantScoper } from "@/domains/identity/tenant-scoper";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.DEBUG_PRISMA === "true"
        ? ["query", "error", "warn"]
        : ["error", "warn"],
  });

// Always cache the client on globalThis across all environments (Vercel, Docker, VPS, Dev)
// to prevent multiple PrismaClient instances and connection exhaustion.
globalForPrisma.prisma = prisma;

/**
 * Returns a Prisma client instance with automatic tenant isolation applied via $extends (IAM-002)
 */
export function getTenantScopedPrisma(organizationId?: string, isPlatformAdmin: boolean = false) {
  return prisma.$extends(createTenantScoper(organizationId, isPlatformAdmin));
}
