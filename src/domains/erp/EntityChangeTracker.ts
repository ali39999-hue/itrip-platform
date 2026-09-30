import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export interface FieldChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

export interface EntityDiffResult {
  hasChanges: boolean;
  changedFields: FieldChange[];
  summary: string;
}

const REDACTED_FIELDS = new Set([
  'password',
  'passwordhash',
  'hashedpassword',
  'salt',
  'token',
  'refreshtoken',
  'cvv',
  'cardnumber',
  'otp',
  'secret',
  'secretkey',
]);

/**
 * Computes deterministic field-by-field differences between old and new state of an ERP entity.
 * Adapted from aroux30/site audit changelog and entity change tracking module.
 */
export function computeFieldDiff(
  oldState: Record<string, unknown> | null | undefined,
  newState: Record<string, unknown> | null | undefined,
  options?: {
    ignoredFields?: string[];
  }
): EntityDiffResult {
  const ignored = new Set(['updatedAt', 'createdAt', ...(options?.ignoredFields || [])]);
  const changedFields: FieldChange[] = [];

  const oldObj = oldState || {};
  const newObj = newState || {};

  const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

  for (const key of allKeys) {
    if (ignored.has(key)) continue;

    const oldVal = oldObj[key];
    const newVal = newObj[key];

    // Check if values differ
    const isDifferent =
      typeof oldVal === 'object' || typeof newVal === 'object'
        ? JSON.stringify(oldVal) !== JSON.stringify(newVal)
        : oldVal !== newVal;

    if (isDifferent) {
      const isRedacted = REDACTED_FIELDS.has(key.toLowerCase());
      changedFields.push({
        field: key,
        oldValue: isRedacted ? '[REDACTED]' : oldVal,
        newValue: isRedacted ? '[REDACTED]' : newVal,
      });
    }
  }

  const fieldNames = changedFields.map((f) => f.field).join(', ');
  const summary =
    changedFields.length > 0
      ? `تغییر در ${changedFields.length} فیلد (${fieldNames})`
      : 'بدون تغییر';

  return {
    hasChanges: changedFields.length > 0,
    changedFields,
    summary,
  };
}

export class EntityChangeTracker {
  /**
   * Tracks and records an entity modification into AuditLog table with JSON before/after state.
   */
  static async recordEntityChange(
    params: {
      resource: string;
      resourceId: string;
      oldState?: Record<string, unknown> | null;
      newState?: Record<string, unknown> | null;
      action: string;
      userId?: string | null;
      organizationId?: string | null;
      reason?: string | null;
      correlationId?: string | null;
      ipAddress?: string | null;
      userAgent?: string | null;
    },
    tx?: Prisma.TransactionClient
  ): Promise<{ auditLogId?: string; diff: EntityDiffResult }> {
    const client = tx || prisma;
    const diff = computeFieldDiff(params.oldState, params.newState);

    if (!diff.hasChanges && params.action !== 'CREATE' && params.action !== 'DELETE') {
      return { diff };
    }

    const audit = await client.auditLog.create({
      data: {
        resource: params.resource,
        resourceId: params.resourceId,
        action: params.action,
        userId: params.userId || null,
        organizationId: params.organizationId || null,
        oldData: params.oldState ? JSON.stringify(params.oldState) : null,
        newData: params.newState ? JSON.stringify(params.newState) : null,
        reason: params.reason || diff.summary,
        correlationId: params.correlationId || null,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
      },
    });

    return {
      auditLogId: audit.id,
      diff,
    };
  }
}
