/**
 * Canonical Business Metrics Service (OBS-005)
 * Tracks key operational and business telemetry: conversion funnels, payments,
 * ticketing, refunds, price changes, and gateway reliability.
 */

import { createLogger } from './logger';

export interface BusinessMetricsSnapshot {
  timestamp: string;
  counters: {
    searchesTotal: number;
    draftsCreated: number;
    bookingsConfirmed: number;
    paymentsCaptured: number;
    paymentsFailed: number;
    refundsProcessed: number;
    priceChangesDetected: number;
    staleBookingsSwept: number;
  };
  rates: {
    checkoutConversionRate: number; // bookingsConfirmed / draftsCreated
    paymentSuccessRate: number;     // paymentsCaptured / (paymentsCaptured + paymentsFailed)
  };
}

class BusinessMetricsRegistry {
  private counters = {
    searchesTotal: 0,
    draftsCreated: 0,
    bookingsConfirmed: 0,
    paymentsCaptured: 0,
    paymentsFailed: 0,
    refundsProcessed: 0,
    priceChangesDetected: 0,
    staleBookingsSwept: 0,
  };

  private logger = createLogger('business-metrics');

  recordSearch(type: 'FLIGHT' | 'HOTEL' | 'TOUR', destination?: string) {
    this.counters.searchesTotal++;
    this.logger.info('Metric: Search Recorded', { metric: 'search', type, destination });
  }

  recordDraftCreated(type: string, amount: number) {
    this.counters.draftsCreated++;
    this.logger.info('Metric: Draft Created', { metric: 'draft_created', type, amount });
  }

  recordBookingConfirmed(bookingId: string, amount: number) {
    this.counters.bookingsConfirmed++;
    this.logger.info('Metric: Booking Confirmed', { metric: 'booking_confirmed', bookingId, amount });
  }

  recordPaymentCaptured(gateway: string, amount: number) {
    this.counters.paymentsCaptured++;
    this.logger.info('Metric: Payment Captured', { metric: 'payment_captured', gateway, amount });
  }

  recordPaymentFailed(gateway: string, reason: string) {
    this.counters.paymentsFailed++;
    this.logger.warn('Metric: Payment Failed', { metric: 'payment_failed', gateway, reason });
  }

  recordRefundProcessed(refundId: string, amount: number) {
    this.counters.refundsProcessed++;
    this.logger.info('Metric: Refund Processed', { metric: 'refund_processed', refundId, amount });
  }

  recordPriceChange(oldPrice: number, newPrice: number) {
    this.counters.priceChangesDetected++;
    this.logger.warn('Metric: Price Change Detected', { metric: 'price_change', oldPrice, newPrice });
  }

  recordStaleBookingSwept(count: number) {
    this.counters.staleBookingsSwept += count;
  }

  getSnapshot(): BusinessMetricsSnapshot {
    const drafts = this.counters.draftsCreated;
    const confirmed = this.counters.bookingsConfirmed;
    const captured = this.counters.paymentsCaptured;
    const failed = this.counters.paymentsFailed;

    const checkoutConversionRate = drafts > 0 ? Number(((confirmed / drafts) * 100).toFixed(2)) : 0;
    const totalAttempts = captured + failed;
    const paymentSuccessRate = totalAttempts > 0 ? Number(((captured / totalAttempts) * 100).toFixed(2)) : 100;

    return {
      timestamp: new Date().toISOString(),
      counters: { ...this.counters },
      rates: {
        checkoutConversionRate,
        paymentSuccessRate,
      },
    };
  }

  reset() {
    Object.keys(this.counters).forEach((k) => {
      this.counters[k as keyof typeof this.counters] = 0;
    });
  }
}

export const businessMetrics = new BusinessMetricsRegistry();
