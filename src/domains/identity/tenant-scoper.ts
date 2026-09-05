import { Prisma } from '@prisma/client';

/**
 * Prisma Client Extension ($extends) for Automatic Multi-Tenant Scoping (IAM-002)
 * Automatically restricts read, write, count, and mutation operations on tenant models
 * to the active organization ID, preventing data leakage and IDOR.
 */
export function createTenantScoper(activeOrganizationId?: string, isPlatformAdmin: boolean = false) {
  return Prisma.defineExtension({
    name: 'tenant-isolation-extension',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          // Models that belong to specific organizations
          const tenantScopedModels = ['Booking', 'Invoice', 'TravelDocument'];

          if (!tenantScopedModels.includes(model) || isPlatformAdmin) {
            return query(args);
          }

          if (!activeOrganizationId) {
            throw new Error(`SECURITY_ERROR: Access denied. Missing tenant organization context for model ${model}`);
          }

          const modifiedArgs = (args ?? {}) as Record<string, unknown>;

          if (['findFirst', 'findMany', 'count', 'updateMany', 'deleteMany'].includes(operation)) {
            modifiedArgs.where = {
              ...(modifiedArgs.where as Record<string, unknown> || {}),
              organizationId: activeOrganizationId,
            };
            return query(modifiedArgs as typeof args);
          }

          if (['create'].includes(operation)) {
            const data = (modifiedArgs.data as Record<string, unknown> || {});
            if (!data.organizationId) {
              data.organizationId = activeOrganizationId;
            }
            modifiedArgs.data = data;
            return query(modifiedArgs as typeof args);
          }

          if (['upsert'].includes(operation)) {
            const createData = (modifiedArgs.create as Record<string, unknown> || {});
            if (!createData.organizationId) {
              createData.organizationId = activeOrganizationId;
            }
            modifiedArgs.create = createData;
            return query(modifiedArgs as typeof args);
          }

          return query(args);
        },
      },
    },
  });
}
