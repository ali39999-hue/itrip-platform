import { sanitizeProps } from '@/lib/analytics';

/**
 * Privacy-safe helpers for first-party behavior analytics (ERP heatmap).
 * - Routes are normalized: locale prefix kept, query/hash stripped, dynamic
 *   ids collapsed, length clamped. Never stores raw query strings (PII risk).
 * - Selectors carry tag + safe attrs only, never text content.
 * - Props reuse the funnel sanitizeProps allowlist semantics.
 */

export const BEHAVIOR_TYPES = ['PAGE_VIEW', 'CLICK', 'SCROLL_DEPTH', 'FUNNEL'] as const;
export type BehaviorType = (typeof BEHAVIOR_TYPES)[number];

export const BEHAVIOR_DEVICES = ['mobile', 'tablet', 'desktop'] as const;

const MAX_ROUTE_LEN = 200;
const MAX_SELECTOR_LEN = 120;
const MAX_BATCH = 50;

/** Collapse /[id]/ segments and opaque tokens (cuid/uuid/db-ids/booking refs) to :id */
function looksLikeId(seg: string): boolean {
  if (/^\d+$/.test(seg)) return true; // pure digits: /hotels/123
  if (/^[0-9a-f-]{20,}$/i.test(seg)) return true; // uuid / long hex
  if (/^c[a-z0-9]{20,}$/i.test(seg)) return true; // cuid
  if (seg.includes('_')) return true; // usr_xxx, saga_tst_..., cm_xxx
  if (seg.length >= 24) return true; // long opaque tokens
  // Booking refs: uppercase + digits, e.g. FZ-8X2K9Q (lowercase slugs like
  // travel-files or Persian decoded slugs never match this branch)
  if (/^[A-Z0-9-]{8,}$/.test(seg) && /[0-9]/.test(seg) && /[A-Z]/.test(seg)) return true;
  return false;
}

function collapseDynamicSegments(path: string): string {
  return path
    .split('/')
    .map((seg) => {
      if (!seg) return seg;
      // Decode first so Persian slugs (long when percent-encoded) are
      // measured by real length and survive; opaque ids still collapse.
      let dec = seg;
      try {
        dec = decodeURIComponent(seg);
      } catch {
        /* keep raw on malformed encoding */
      }
      return looksLikeId(dec) ? ':id' : seg;
    })
    .join('/');
}

export function normalizeRoute(input: string): string {
  try {
    let path = input.trim().slice(0, MAX_ROUTE_LEN + 100);
    // Accept full URLs too — keep pathname only (drops query/hash = PII).
    if (/^https?:\/\//i.test(path)) {
      path = new URL(path).pathname;
    } else {
      path = path.split('?')[0]?.split('#')[0] ?? path;
    }
    if (!path.startsWith('/')) path = `/${path}`;
    path = collapseDynamicSegments(path);
    // Strip trailing slash except root
    if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
    return path.slice(0, MAX_ROUTE_LEN).toLowerCase();
  } catch {
    return '/';
  }
}

export function sanitizeSelector(input: unknown): string | undefined {
  if (typeof input !== 'string' || !input) return undefined;
  // Allow only tag + [data-*] / .class / #id-ish safe chars; drop text content.
  const cleaned = input.replace(/[^a-zA-Z0-9\-_.\[\]=:"'\s]/g, '').slice(0, MAX_SELECTOR_LEN);
  return cleaned || undefined;
}

export function toDevice(viewportW?: number): 'mobile' | 'tablet' | 'desktop' {
  if (!viewportW || viewportW < 768) return 'mobile';
  if (viewportW < 1024) return 'tablet';
  return 'desktop';
}

export interface BehaviorPayload {
  type: BehaviorType;
  route: string;
  locale?: string;
  xPct?: number;
  yPct?: number;
  scrollPct?: number;
  selector?: string;
  viewportW?: number;
  viewportH?: number;
  device?: string;
  event?: string;
  props?: Record<string, unknown>;
  ts?: number;
}

export interface SanitizedBehaviorEvent {
  type: BehaviorType;
  route: string;
  locale?: string;
  xPct?: number;
  yPct?: number;
  scrollPct?: number;
  selector?: string;
  viewportW?: number;
  viewportH?: number;
  device?: string;
  propsJson?: string;
}

/** Validate + scrub one client event. Returns null when the event must be dropped. */
export function sanitizeBehaviorEvent(raw: BehaviorPayload): SanitizedBehaviorEvent | null {
  if (!raw || typeof raw !== 'object') return null;
  if (!BEHAVIOR_TYPES.includes(raw.type)) return null;

  const route = normalizeRoute(String(raw.route ?? '/'));
  if (!route || route.length < 1) return null;

  const locale =
    typeof raw.locale === 'string' && /^(fa|en|ar|zh|ru)$/.test(raw.locale) ? raw.locale : undefined;

  let xPct: number | undefined;
  let yPct: number | undefined;
  if (raw.type === 'CLICK') {
    const x = Number(raw.xPct);
    const y = Number(raw.yPct);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    xPct = Math.min(100, Math.max(0, Math.round(x * 10) / 10));
    yPct = Math.min(100, Math.max(0, Math.round(y * 10) / 10));
  }

  let scrollPct: number | undefined;
  if (raw.type === 'SCROLL_DEPTH') {
    const s = Number(raw.scrollPct);
    if (![25, 50, 75, 100].includes(s)) return null;
    scrollPct = s;
  }

  const viewportW =
    Number.isFinite(Number(raw.viewportW)) && Number(raw.viewportW) > 0
      ? Math.min(7680, Math.floor(Number(raw.viewportW)))
      : undefined;
  const viewportH =
    Number.isFinite(Number(raw.viewportH)) && Number(raw.viewportH) > 0
      ? Math.min(4320, Math.floor(Number(raw.viewportH)))
      : undefined;

  const device =
    typeof raw.device === 'string' && (BEHAVIOR_DEVICES as readonly string[]).includes(raw.device)
      ? raw.device
      : toDevice(viewportW);

  // Merge funnel event name into props for FUNNEL type
  const baseProps: Record<string, unknown> =
    raw.props && typeof raw.props === 'object' ? (raw.props as Record<string, unknown>) : {};
  if (raw.type === 'FUNNEL' && typeof raw.event === 'string') {
    baseProps.event = raw.event.slice(0, 60);
  }
  const clean = sanitizeProps(baseProps);
  const propsJson = Object.keys(clean).length > 0 ? JSON.stringify(clean).slice(0, 2000) : undefined;

  return {
    type: raw.type,
    route,
    locale,
    xPct,
    yPct,
    scrollPct,
    selector: sanitizeSelector(raw.selector),
    viewportW,
    viewportH,
    device,
    propsJson,
  };
}

export function sanitizeBatch(input: unknown): SanitizedBehaviorEvent[] {
  if (!Array.isArray(input)) return [];
  const out: SanitizedBehaviorEvent[] = [];
  for (const item of input.slice(0, MAX_BATCH)) {
    const clean = sanitizeBehaviorEvent(item as BehaviorPayload);
    if (clean) out.push(clean);
  }
  return out;
}

export const BEHAVIOR_MAX_BATCH = MAX_BATCH;
