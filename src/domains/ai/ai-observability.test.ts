import { describe, it, expect, beforeEach } from 'vitest';
import {
  AiObservabilityService,
} from './ai-observability';

describe('Section 40: AI Observability & Safe Operational Tracing', () => {
  beforeEach(() => {
    AiObservabilityService.clearForTesting();
  });

  it('records an operational trace without exposing raw reasoning', () => {
    const trace = AiObservabilityService.recordTrace({
      intent: 'SEARCH_FLIGHTS',
      provider: 'gemini',
      model: 'gemini-2.0-flash',
      toolsUsed: ['search_flights'],
      dataSources: ['supplier_parto', 'cached_fares'],
      latencyMs: 340,
      success: true,
      confidenceScore: 0.95,
      sanitizedQueryPreview: 'پرواز تهران به استانبول',
    });

    expect(trace.traceId).toMatch(/^tr_ai_\d+_[a-z0-9]+$/);
    expect(trace.latencyMs).toBe(340);
    expect(trace.success).toBe(true);

    const recent = AiObservabilityService.getRecentTraces(5);
    expect(recent.length).toBe(1);
    expect(recent[0].traceId).toBe(trace.traceId);
  });

  it('computes accurate operational health metrics across requests', () => {
    AiObservabilityService.recordTrace({
      intent: 'PLAN_ITINERARY',
      provider: 'gemini',
      model: 'gemini-2.0-flash',
      toolsUsed: ['search_hotels', 'search_flights'],
      dataSources: ['booking_db'],
      latencyMs: 500,
      success: true,
    });

    AiObservabilityService.recordTrace({
      intent: 'ESTIMATE_BUDGET',
      provider: 'deepseek',
      model: 'deepseek-chat',
      toolsUsed: ['estimate_trip_budget'],
      dataSources: ['fx_rates'],
      latencyMs: 300,
      success: true,
    });

    AiObservabilityService.recordTrace({
      intent: 'SEARCH_HOTELS',
      provider: 'gemini',
      model: 'gemini-2.0-flash',
      toolsUsed: ['search_hotels'],
      dataSources: ['supplier_alibaba'],
      latencyMs: 400,
      success: false,
      errorMessage: 'Rate limit exceeded (HTTP 429)',
    });

    const metrics = AiObservabilityService.computeMetrics();
    expect(metrics.totalTraces).toBe(3);
    // 2 out of 3 = 0.67
    expect(metrics.successRate).toBeCloseTo(0.67, 1);
    expect(metrics.averageLatencyMs).toBe(400); // (500 + 300 + 400) / 3
    expect(metrics.providerDistribution['gemini']).toBe(2);
    expect(metrics.providerDistribution['deepseek']).toBe(1);
    expect(metrics.toolUsageFrequencies['search_hotels']).toBe(2);
  });
});
