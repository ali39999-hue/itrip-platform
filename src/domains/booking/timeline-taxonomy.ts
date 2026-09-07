export type TimelineCategory =
  | 'LIFECYCLE'
  | 'PAYMENT'
  | 'REFUND'
  | 'INVENTORY'
  | 'AUDIT'
  | 'SUPPLIER';

export type TimelineSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface CanonicalTimelineEvent {
  id: string;
  version: '2.0';
  category: TimelineCategory;
  eventType: string; // e.g., 'BOOKING_CREATED', 'PAYMENT_CAPTURED', 'HOLD_RELEASED'
  title: string;
  description?: string;
  actor: string; // user id or SYSTEM / GATEWAY
  status?: string;
  amount?: number;
  currency?: string;
  correlationId?: string;
  severity: TimelineSeverity;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

export class TimelineTaxonomyService {
  public static readonly VERSION = '2.0';

  static createEvent(params: {
    id: string;
    category: TimelineCategory;
    eventType: string;
    title: string;
    description?: string;
    actor?: string;
    status?: string;
    amount?: number;
    currency?: string;
    correlationId?: string;
    severity?: TimelineSeverity;
    metadata?: Record<string, unknown>;
    timestamp?: Date;
  }): CanonicalTimelineEvent {
    return {
      id: params.id,
      version: '2.0',
      category: params.category,
      eventType: params.eventType,
      title: params.title,
      description: params.description,
      actor: params.actor || 'SYSTEM',
      status: params.status,
      amount: params.amount,
      currency: params.currency,
      correlationId: params.correlationId,
      severity: params.severity || 'INFO',
      metadata: params.metadata,
      timestamp: params.timestamp || new Date(),
    };
  }
}
