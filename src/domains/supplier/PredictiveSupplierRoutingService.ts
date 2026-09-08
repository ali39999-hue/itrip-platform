import { prisma } from '@/lib/prisma';
import { SupplierTransport, SupplierHealthRecord } from './SupplierTransport';

export interface SupplierRoutingCandidate {
  supplierId: string;
  name: string;
  productType: string;
  health: SupplierHealthRecord;
  compositeScore: number; // 0 to 100
  isDegraded: boolean;
}

export interface RoutingDecision {
  primarySupplierId: string;
  primarySupplierName: string;
  fallbackSupplierId?: string;
  candidatesRanked: SupplierRoutingCandidate[];
  routingReason: string;
  decidedAt: Date;
}

export class PredictiveSupplierRoutingService {
  /**
   * Calculates a composite quality score (0-100) based on success rate, latency, and error rate.
   */
  static calculateCompositeScore(health: SupplierHealthRecord): number {
    const total = health.totalRequests;
    const successRate = total > 0 ? (health.successfulRequests / total) * 100 : 99;
    const errorRate = total > 0 ? (health.failedRequests / total) * 100 : 1;
    const avgLatency = health.averageLatencyMs || 350;

    // 1. Success rate weight: 50%
    const successWeight = (successRate / 100) * 50;

    // 2. Latency weight: 30% (perfect <= 500ms, decays down to 0 at >= 3000ms)
    let latencyScore = 0;
    if (avgLatency <= 500) {
      latencyScore = 30;
    } else if (avgLatency >= 3000) {
      latencyScore = 0;
    } else {
      latencyScore = Math.max(0, 30 * (1 - (avgLatency - 500) / 2500));
    }

    // 3. Error rate penalty: 20% (0% error = 20 pts, 20%+ error = 0 pts)
    const errorScore = Math.max(0, 20 * (1 - errorRate / 20));

    return Math.round(successWeight + latencyScore + errorScore);
  }

  /**
   * Selects the optimal supplier dynamically for a given product type (RISK-102)
   */
  static async selectOptimalSupplier(productType: 'FLIGHT' | 'HOTEL'): Promise<RoutingDecision> {
    const suppliers = await prisma.supplier.findMany({
      where: {
        isActive: true,
        type: productType === 'FLIGHT' ? { in: ['AIRLINE', 'TOUR_OPERATOR'] } : 'HOTEL',
      },
    });

    if (suppliers.length === 0) {
      // Return sensible fallback sentinel if no dynamic supplier rows found in DB
      const defaultCode = productType === 'FLIGHT' ? 'PARTO_GDS' : 'EGHAMAT24_BEDBANK';
      const health = SupplierTransport.getHealth(defaultCode);
      return {
        primarySupplierId: productType === 'FLIGHT' ? 'parto-gds' : 'eghamat24-bedbank',
        primarySupplierName: productType === 'FLIGHT' ? 'Parto GDS' : 'Eghamat24',
        candidatesRanked: [
          {
            supplierId: productType === 'FLIGHT' ? 'parto-gds' : 'eghamat24-bedbank',
            name: productType === 'FLIGHT' ? 'Parto GDS' : 'Eghamat24',
            productType,
            health,
            compositeScore: this.calculateCompositeScore(health),
            isDegraded: false,
          },
        ],
        routingReason: 'Default provider selected (no dynamic supplier rows found in DB)',
        decidedAt: new Date(),
      };
    }

    const candidates: SupplierRoutingCandidate[] = suppliers.map((sup) => {
      const health = SupplierTransport.getHealth(sup.id);
      const compositeScore = this.calculateCompositeScore(health);
      const cb = SupplierTransport.getCircuitBreaker(sup.id);
      const isDegraded = cb.getState() === 'OPEN' || compositeScore < 50;

      return {
        supplierId: sup.id,
        name: sup.name,
        productType,
        health,
        compositeScore,
        isDegraded,
      };
    });

    // Sort descending by compositeScore
    candidates.sort((a, b) => b.compositeScore - a.compositeScore);

    const primary = candidates.find((c) => !c.isDegraded) || candidates[0];
    const fallback = candidates.find((c) => c.supplierId !== primary.supplierId && !c.isDegraded);

    const routingReason = `Selected ${primary.name} (score: ${primary.compositeScore}/100, requests: ${primary.health.totalRequests}, latency: ${primary.health.averageLatencyMs}ms)`;

    return {
      primarySupplierId: primary.supplierId,
      primarySupplierName: primary.name,
      fallbackSupplierId: fallback?.supplierId,
      candidatesRanked: candidates,
      routingReason,
      decidedAt: new Date(),
    };
  }
}
