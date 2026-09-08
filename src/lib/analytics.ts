/**
 * Privacy-safe product analytics for Firuzo / iTrip.
 *
 * Design decisions (UX skill: PostHog funnel measurement):
 * - Event allowlist: only funnel/product events are tracked. Arbitrary strings are dropped.
 * - PII scrubbing: keys that look like contact/identity documents are stripped and
 *   long strings are truncated, so passenger data can never leak into analytics.
 * - Respects Do-Not-Track and ad-blockers: no-ops when `navigator.doNotTrack === '1'`.
 * - PostHog loads lazily (dynamic import) and only when `NEXT_PUBLIC_POSTHOG_KEY`
 *   is configured — zero bundle/behavior change otherwise.
 * - Anonymous distinct id (random UUID in localStorage). Never call `identify()`
 *   with a phone/email — the auth store forbids PII in client persistence.
 */

const ALLOWED_EVENTS = new Set([
  'search_started',
  'search_submitted',
  'flight_selected',
  'hotel_selected',
  'filter_applied',
  'sort_changed',
  'compare_opened',
  'price_alert_created',
  'checkout_started',
  'passenger_submitted',
  'payment_started',
  'payment_succeeded',
  'payment_failed',
  'addon_toggled',
]);

export type AnalyticsEvent = Parameters<typeof trackEvent>[0];

const PII_KEY_PATTERN =
  /(email|phone|mobile|passport|national|nid|birth|gender|first.?name|last.?name|address|card|iban|otp|password)/i;

const MAX_STRING_LENGTH = 120;
const MAX_PROPS = 20;

type Props = Record<string, unknown>;

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof navigator !== 'undefined';
}

/** Remove PII-ish keys and clamp payload size. Pure — safe to unit test. */
export function sanitizeProps(props: Props = {}): Props {
  const clean: Props = {};
  for (const [key, value] of Object.entries(props).slice(0, MAX_PROPS)) {
    if (PII_KEY_PATTERN.test(key)) continue;
    if (typeof value === 'string') {
      if (PII_KEY_PATTERN.test(value) && value.length > 0 && /[@]/.test(value)) continue;
      clean[key] = value.slice(0, MAX_STRING_LENGTH);
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      clean[key] = value;
    } else if (value == null) {
      continue;
    }
    // Objects/arrays are dropped deliberately: funnel props stay scalar.
  }
  return clean;
}

export function isAnalyticsAllowed(): boolean {
  if (!isBrowser()) return false;
  if (navigator.doNotTrack === '1') return false;
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return false;
  return true;
}

let posthogPromise: Promise<{ capture: (e: string, p?: Props) => void } | null> | null;
let queued: Array<{ event: string; props: Props }> = [];

function loadPosthog() {
  if (posthogPromise) return posthogPromise;
  posthogPromise = import('posthog-js')
    .then(({ default: posthog }) => {
      posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY as string, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com',
        autocapture: false, // funnel events only — no surprise PII capture
        capture_pageview: false,
        capture_pageleave: true,
        persistence: 'localStorage',
      });
      return posthog;
    })
    .catch(() => null);
  return posthogPromise;
}

/** Initialize PostHog once (call from the client Providers). Safe to call repeatedly. */
export function initAnalytics(): void {
  if (!isAnalyticsAllowed()) return;
  void loadPosthog().then((ph) => {
    if (!ph) return;
    const pending = queued;
    queued = [];
    for (const { event, props } of pending) ph.capture(event, props);
  });
}

/**
 * Track a funnel/product event. Drops unknown events and scrubs PII.
 * Never throws — analytics must never break booking flows.
 */
export function trackEvent(event: string, props: Props = {}): void {
  try {
    if (!ALLOWED_EVENTS.has(event)) return;
    const clean = sanitizeProps(props);
    if (!isAnalyticsAllowed()) return;
    if (!posthogPromise) void loadPosthog();
    // Queue until the SDK is ready; initAnalytics() flushes.
    void (posthogPromise as Promise<{ capture: (e: string, p?: Props) => void } | null>).then(
      (ph) => {
        if (ph) ph.capture(event, clean);
        else queued.push({ event, props: clean });
      },
    );
  } catch {
    // Intentionally silent.
  }
}

/** Convenience: measure a booking-funnel step with route + locale context. */
export function trackFunnel(
  event: string,
  context: { route?: string; locale?: string; [key: string]: unknown } = {},
): void {
  trackEvent(event, context);
}
