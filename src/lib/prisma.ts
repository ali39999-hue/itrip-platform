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
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/**
 * Returns a Prisma client instance with automatic tenant isolation applied via $extends (IAM-002)
 */
export function getTenantScopedPrisma(organizationId?: string, isPlatformAdmin: boolean = false) {
  return prisma.$extends(createTenantScoper(organizationId, isPlatformAdmin));
}
