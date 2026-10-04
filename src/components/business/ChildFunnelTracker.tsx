'use client';

import { useEffect, useRef } from 'react';
import { trackFunnel } from '@/lib/analytics';

/**
 * T1111/T1112 — fires one Child funnel event on mount (deduped per mount).
 * Server pages mount this with the event name + scalar props; PII-safe
 * sanitization and the allowlist live in lib/analytics.
 */
export function ChildFunnelTracker({
  event,
  props = {},
}: {
  event: 'child_home_viewed' | 'tour_viewed' | 'booking_started' | 'support_opened';
  props?: Record<string, string | number | boolean>;
}) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    trackFunnel(event, {
      route: typeof window !== 'undefined' ? window.location.pathname : undefined,
      ...props,
    });
  }, [event, props]);

  return null;
}
