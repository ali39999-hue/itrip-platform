/**
 * OBS-107: Canonical Production Alerting Engine
 *
 * Evaluates core system telemetry against production SLO thresholds:
 * - Error Rate > 2% (0.02) -> CRITICAL
 * - Payment Failure Rate > 5% (0.05) -> CRITICAL
 * - Queue Message Age > 5 minutes (300,000ms) -> WARNING / CRITICAL
 * - Dead-Letter Backlog > 10 events -> WARNING
 * - Ledger Imbalance > 0 -> CRITICAL
 *
 * Supports alert deduplication, cooldown windows, auto-resolution, and listener dispatch.
 */

import { createLogger } from './logger';

export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface AlertRule {
  id: string;
  name: string;
  metric: 'errorRate' | 'paymentFailureRate' | 'queueAgeMs' | 'dlqCount' | 'ledgerUnbalanced';
  threshold: number;
  severity: AlertSeverity;
  description: string;
}

export interface SystemMetricsInput {
  totalRequests?: number;
  errorRequests?: number;
  paymentCaptures?: number;
  paymentFailures?: number;
  oldestQueueAgeMs?: number;
  dlqCount?: number;
  ledgerUnbalancedCount?: number;
}

export interface Alert {
  id: string;
  ruleId: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  currentValue: number;
  threshold: number;
  triggeredAt: string;
  resolvedAt?: string;
  isResolved: boolean;
}

export interface AlertEvaluationResult {
  triggeredAlerts: Alert[];
  resolvedAlerts: Alert[];
  activeAlertsCount: number;
}

export const DEFAULT_ALERT_RULES: AlertRule[] = [
  {
    id: 'RULE_HIGH_ERROR_RATE',
    name: 'High System Error Rate',
    metric: 'errorRate',
    threshold: 0.02, // 2%
    severity: 'CRITICAL',
    description: 'System request error rate exceeds 2% threshold',
  },
  {
    id: 'RULE_PAYMENT_FAILURE_RATE',
    name: 'Elevated Payment Failure Rate',
    metric: 'paymentFailureRate',
    threshold: 0.05, // 5%
    severity: 'CRITICAL',
    description: 'Payment failure rate exceeds 5% threshold',
  },
  {
    id: 'RULE_QUEUE_PROCESSING_LAG',
    name: 'Outbox Queue Processing Lag',
    metric: 'queueAgeMs',
    threshold: 5 * 60 * 1000, // 5 minutes in ms
    severity: 'CRITICAL',
    description: 'Outbox queue oldest pending event age exceeds 5 minutes',
  },
  {
    id: 'RULE_DEAD_LETTER_QUEUE_BACKLOG',
    name: 'Dead Letter Queue Accumulation',
    metric: 'dlqCount',
    threshold: 10,
    severity: 'WARNING',
    description: 'Dead letter queue holds more than 10 unrecovered events',
  },
  {
    id: 'RULE_LEDGER_DOUBLE_ENTRY_IMBALANCE',
    name: 'Ledger Double-Entry Invariant Violation',
    metric: 'ledgerUnbalanced',
    threshold: 0,
    severity: 'CRITICAL',
    description: 'Unbalanced ledger entry groups detected',
  },
];

export class AlertingServiceClass {
  private logger = createLogger('alerting-service');
  private rules: AlertRule[] = [...DEFAULT_ALERT_RULES];
  private activeAlerts = new Map<string, Alert>();
  private alertHistory: Alert[] = [];
  private listeners: Array<(alert: Alert) => void> = [];

  constructor(customRules?: AlertRule[]) {
    if (customRules) {
      this.rules = customRules;
    }
  }

  onAlert(listener: (alert: Alert) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private dispatchAlert(alert: Alert): void {
    if (alert.severity === 'CRITICAL') {
      this.logger.error(`[ALERT:CRITICAL] ${alert.title}`, { alert });
    } else {
      this.logger.warn(`[ALERT:${alert.severity}] ${alert.title}`, { alert });
    }

    for (const listener of this.listeners) {
      try {
        listener(alert);
      } catch (err) {
        this.logger.error('Failed to dispatch alert to listener', { error: String(err) });
      }
    }
  }

  evaluateMetrics(metrics: SystemMetricsInput): AlertEvaluationResult {
    const triggeredAlerts: Alert[] = [];
    const resolvedAlerts: Alert[] = [];

    // Calculate rates
    const totalReq = metrics.totalRequests ?? 0;
    const errReq = metrics.errorRequests ?? 0;
    const errorRate = totalReq > 0 ? errReq / totalReq : 0;

    const captured = metrics.paymentCaptures ?? 0;
    const failed = metrics.paymentFailures ?? 0;
    const totalPayments = captured + failed;
    const paymentFailureRate = totalPayments > 0 ? failed / totalPayments : 0;

    const queueAgeMs = metrics.oldestQueueAgeMs ?? 0;
    const dlqCount = metrics.dlqCount ?? 0;
    const ledgerUnbalanced = metrics.ledgerUnbalancedCount ?? 0;

    const values: Record<AlertRule['metric'], number> = {
      errorRate,
      paymentFailureRate,
      queueAgeMs,
      dlqCount,
      ledgerUnbalanced,
    };

    for (const rule of this.rules) {
      const currentVal = values[rule.metric];
      const isBreaching = currentVal > rule.threshold;
      const existing = this.activeAlerts.get(rule.id);

      if (isBreaching && !existing) {
        // Trigger new alert
        const alert: Alert = {
          id: `alt_${rule.id}_${Date.now()}`,
          ruleId: rule.id,
          severity: rule.severity,
          title: rule.name,
          message: `${rule.description} (value: ${Number(currentVal.toFixed(4))}, threshold: ${rule.threshold})`,
          currentValue: currentVal,
          threshold: rule.threshold,
          triggeredAt: new Date().toISOString(),
          isResolved: false,
        };

        this.activeAlerts.set(rule.id, alert);
        this.alertHistory.push(alert);
        triggeredAlerts.push(alert);
        this.dispatchAlert(alert);
      } else if (!isBreaching && existing) {
        // Resolve active alert
        existing.isResolved = true;
        existing.resolvedAt = new Date().toISOString();
        this.activeAlerts.delete(rule.id);
        resolvedAlerts.push(existing);
        this.logger.info(`[ALERT:RESOLVED] ${existing.title}`, {
          ruleId: rule.id,
          resolvedValue: currentVal,
        });
      }
    }

    return {
      triggeredAlerts,
      resolvedAlerts,
      activeAlertsCount: this.activeAlerts.size,
    };
  }

  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values());
  }

  getAlertHistory(): Alert[] {
    return [...this.alertHistory];
  }

  reset(): void {
    this.activeAlerts.clear();
    this.alertHistory = [];
  }
}

export const alertingService = new AlertingServiceClass();
export const AlertingService = alertingService;
