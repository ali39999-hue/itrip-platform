import { prisma } from '@/lib/prisma';

export type ExceptionType =
  | 'TICKET_NOT_ISSUED'
  | 'PAYMENT_MISMATCH'
  | 'SUPPLIER_TIMEOUT'
  | 'REFUND_TIMEOUT'
  | 'PRICE_MISMATCH'
  | string;

export type ExceptionSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ExceptionStatus = 'OPEN' | 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export interface ExceptionFilter {
  type?: ExceptionType | ExceptionType[];
  severity?: ExceptionSeverity;
  status?: ExceptionStatus;
  entityType?: string;
  ownerId?: string;
}

export interface ExceptionStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  critical: number;
  breachedSlaCount: number;
  queueCounts: {
    TICKET_NOT_ISSUED: number;
    PAYMENT_MISMATCH: number;
    SUPPLIER_TIMEOUT: number;
    REFUND_TIMEOUT: number;
    PRICE_MISMATCH: number;
    OTHER: number;
  };
}

export class ExceptionCenterService {
  /**
   * Default SLA durations in minutes based on severity
   */
  public static readonly DEFAULT_SLA_MINUTES: Record<ExceptionSeverity, number> = {
    CRITICAL: 15,
    HIGH: 60,
    MEDIUM: 240,
    LOW: 1440,
  };

  /**
   * Standard exception queue types
   */
  public static readonly STANDARD_QUEUES = [
    'TICKET_NOT_ISSUED',
    'PAYMENT_MISMATCH',
    'SUPPLIER_TIMEOUT',
    'REFUND_TIMEOUT',
    'PRICE_MISMATCH',
  ] as const;

  /**
   * Calculates SLA due date from severity or custom minutes
   */
  static calculateSlaDueAt(severity: ExceptionSeverity, customMinutes?: number): Date {
    const minutes = customMinutes ?? (this.DEFAULT_SLA_MINUTES[severity] || 240);
    return new Date(Date.now() + minutes * 60 * 1000);
  }

  /**
   * Computes SLA countdown status for an operational exception
   */
  static getSlaCountdown(exception: { slaDueAt?: Date | null; status: string }): {
    remainingMinutes: number | null;
    isBreached: boolean;
    status: 'ON_TRACK' | 'APPROACHING_BREACH' | 'BREACHED' | 'NO_SLA';
  } {
    if (!exception.slaDueAt) {
      return { remainingMinutes: null, isBreached: false, status: 'NO_SLA' };
    }

    if (exception.status === 'RESOLVED' || exception.status === 'CLOSED') {
      return { remainingMinutes: 0, isBreached: false, status: 'ON_TRACK' };
    }

    const diffMs = exception.slaDueAt.getTime() - Date.now();
    const remainingMinutes = Math.round(diffMs / (60 * 1000));
    const isBreached = remainingMinutes <= 0;

    let status: 'ON_TRACK' | 'APPROACHING_BREACH' | 'BREACHED' = 'ON_TRACK';
    if (isBreached) {
      status = 'BREACHED';
    } else if (remainingMinutes <= 60) {
      status = 'APPROACHING_BREACH';
    }

    return { remainingMinutes, isBreached, status };
  }

  /**
   * Lists operational exceptions matching optional queue, severity, and status filters
   */
  static async getExceptions(filter?: ExceptionFilter) {
    const where: Record<string, unknown> = {};

    if (filter?.type) {
      if (Array.isArray(filter.type)) {
        where.type = { in: filter.type };
      } else {
        where.type = filter.type;
      }
    }

    if (filter?.severity) {
      where.severity = filter.severity;
    }

    if (filter?.status) {
      where.status = filter.status;
    }

    if (filter?.entityType) {
      where.entityType = filter.entityType;
    }

    if (filter?.ownerId) {
      where.ownerId = filter.ownerId;
    }

    const items = await prisma.operationalException.findMany({
      where,
      orderBy: [{ severity: 'desc' }, { detectedAt: 'desc' }],
    });

    return items.map((item) => {
      const countdown = this.getSlaCountdown(item);
      return {
        ...item,
        slaRemainingMinutes: countdown.remainingMinutes,
        isSlaBreached: countdown.isBreached,
        slaStatus: countdown.status,
      };
    });
  }

  /**
   * Returns aggregated exception queue metrics and SLA breach statistics
   */
  static async getExceptionStats(): Promise<ExceptionStats> {
    const all = await prisma.operationalException.findMany({
      select: {
        id: true,
        type: true,
        severity: true,
        status: true,
        slaDueAt: true,
      },
    });

    const now = Date.now();
    let open = 0;
    let inProgress = 0;
    let resolved = 0;
    let critical = 0;
    let breachedSlaCount = 0;

    const queueCounts = {
      TICKET_NOT_ISSUED: 0,
      PAYMENT_MISMATCH: 0,
      SUPPLIER_TIMEOUT: 0,
      REFUND_TIMEOUT: 0,
      PRICE_MISMATCH: 0,
      OTHER: 0,
    };

    all.forEach((exc) => {
      if (exc.status === 'OPEN') open++;
      else if (exc.status === 'IN_PROGRESS' || exc.status === 'ACKNOWLEDGED') inProgress++;
      else if (exc.status === 'RESOLVED' || exc.status === 'CLOSED') resolved++;

      if (exc.severity === 'CRITICAL' || exc.severity === 'HIGH') critical++;

      if (
        exc.slaDueAt &&
        exc.status !== 'RESOLVED' &&
        exc.status !== 'CLOSED' &&
        exc.slaDueAt.getTime() < now
      ) {
        breachedSlaCount++;
      }

      if (exc.status !== 'RESOLVED' && exc.status !== 'CLOSED') {
        if (exc.type === 'TICKET_NOT_ISSUED') queueCounts.TICKET_NOT_ISSUED++;
        else if (exc.type === 'PAYMENT_MISMATCH') queueCounts.PAYMENT_MISMATCH++;
        else if (exc.type === 'SUPPLIER_TIMEOUT') queueCounts.SUPPLIER_TIMEOUT++;
        else if (exc.type === 'REFUND_TIMEOUT') queueCounts.REFUND_TIMEOUT++;
        else if (exc.type === 'PRICE_MISMATCH') queueCounts.PRICE_MISMATCH++;
        else queueCounts.OTHER++;
      }
    });

    return {
      total: all.length,
      open,
      inProgress,
      resolved,
      critical,
      breachedSlaCount,
      queueCounts,
    };
  }

  /**
   * Creates a new operational exception record with automatic SLA calculation
   */
  static async createException(data: {
    type: ExceptionType;
    severity?: ExceptionSeverity;
    entityType: 'BOOKING' | 'PAYMENT' | 'SUPPLIER' | 'INVENTORY' | 'TRIP' | string;
    entityId: string;
    title: string;
    description?: string;
    slaMinutes?: number;
    ownerId?: string;
  }) {
    const severity = data.severity || 'MEDIUM';
    const slaDueAt = this.calculateSlaDueAt(severity, data.slaMinutes);

    return prisma.operationalException.create({
      data: {
        type: data.type,
        severity,
        entityType: data.entityType,
        entityId: data.entityId,
        title: data.title,
        description: data.description,
        status: 'OPEN',
        ownerId: data.ownerId,
        slaDueAt,
      },
    });
  }

  /**
   * Assigns an owner/operator to the exception and updates status to IN_PROGRESS
   */
  static async assignException(
    exceptionId: string,
    ownerId: string,
    operatorId: string
  ) {
    const current = await prisma.operationalException.findUnique({
      where: { id: exceptionId },
    });
    if (!current) {
      throw new Error(`OperationalException ${exceptionId} not found`);
    }

    const updated = await prisma.operationalException.update({
      where: { id: exceptionId },
      data: {
        ownerId,
        status: current.status === 'OPEN' ? 'IN_PROGRESS' : current.status,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: operatorId,
        action: 'EXCEPTION_ASSIGNED',
        resource: 'OperationalException',
        resourceId: exceptionId,
        newData: JSON.stringify({ ownerId, status: updated.status }),
        reason: `Assigned exception to operator ${ownerId}`,
      },
    });

    return updated;
  }

  /**
   * Resolves an operational exception
   */
  static async resolveException(
    exceptionId: string,
    resolution: string,
    operatorId: string
  ) {
    if (!resolution || !resolution.trim()) {
      throw new Error('Resolution details are required to resolve an exception');
    }

    const updated = await prisma.operationalException.update({
      where: { id: exceptionId },
      data: {
        status: 'RESOLVED',
        resolution: resolution.trim(),
        closedAt: new Date(),
      },
    });

    const userExists = operatorId ? await prisma.user.findUnique({ where: { id: operatorId }, select: { id: true } }) : null;
    await prisma.auditLog.create({
      data: {
        userId: userExists ? operatorId : undefined,
        action: 'EXCEPTION_RESOLVED',
        resource: 'OperationalException',
        resourceId: exceptionId,
        newData: JSON.stringify({ resolution: updated.resolution }),
        reason: `Resolved exception: ${resolution.trim()}`,
      },
    });

    return updated;
  }
}
