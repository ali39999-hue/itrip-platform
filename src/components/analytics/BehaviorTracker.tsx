'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import { trackEvent } from '@/lib/analytics';
import type { BehaviorPayload } from '@/lib/behavior';

const LS_ANON = 'fz_anon_id';
const LS_SESSION = 'fz_session_id';
const LS_SESSION_TS = 'fz_session_ts';
const SESSION_TTL_MS = 30 * 60 * 1000;
const FLUSH_MS = 8000;
const MAX_QUEUE = 40;

function uuid(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }
}

function getIds(): { anonymousId: string; sessionId: string } {
  try {
    let anon = localStorage.getItem(LS_ANON);
    if (!anon) {
      anon = uuid();
      localStorage.setItem(LS_ANON, anon);
    }
    let sess = localStorage.getItem(LS_SESSION);
    const ts = Number(localStorage.getItem(LS_SESSION_TS) ?? 0);
    if (!sess || Date.now() - ts > SESSION_TTL_MS) {
      sess = uuid();
      localStorage.setItem(LS_SESSION, sess);
    }
    localStorage.setItem(LS_SESSION_TS, String(Date.now()));
    return { anonymousId: anon, sessionId: sess ?? uuid() };
  } catch {
    return { anonymousId: 'anon', sessionId: 'sess' };
  }
}

function dntEnabled(): boolean {
  try {
    return navigator.doNotTrack === '1' || (window as unknown as { doNotTrack?: string }).doNotTrack === '1';
  } catch {
    return false;
  }
}

function safeSelector(el: HTMLElement): string | undefined {
  const tag = el.tagName.toLowerCase();
  const testId = el.getAttribute('data-testid') || el.getAttribute('data-action');
  const aria = el.getAttribute('aria-label');
  const cls = (el.className && typeof el.className === 'string' ? el.className : '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .join('.');
  let sel = tag;
  if (testId) sel += `[data=${testId.slice(0, 24)}]`;
  else if (aria) sel += `[aria=${aria.slice(0, 24)}]`;
  else if (cls) sel += `.${cls.slice(0, 32)}`;
  return sel.slice(0, 120);
}

/**
 * First-party behavior tracker for the ERP heatmap.
 * - Page views on pathname change, throttled clicks (normalized %), scroll milestones.
 * - Batch + sendBeacon, DNT-aware, never captures text/PII.
 * - Mirrors funnel milestones into the existing PostHog pipeline when configured.
 */
export function BehaviorTracker() {
  const pathname = usePathname();
  const locale = useLocale();
  const queue = useRef<BehaviorPayload[]>([]);
  const sentScroll = useRef<Set<number>>(new Set());
  const lastClickAt = useRef(0);

  useEffect(() => {
    if (dntEnabled()) return;
    sentScroll.current = new Set();
    const payload: BehaviorPayload = {
      type: 'PAGE_VIEW',
      route: pathname || '/',
      locale,
      viewportW: window.innerWidth,
      viewportH: window.innerHeight,
      ts: Date.now(),
    };
    queue.current.push(payload);
    // Mirror key funnel entry into PostHog (allowlisted, PII-free)
    try {
      trackEvent('trip_opened', { route: pathname, locale });
    } catch {
      /* noop */
    }
  }, [pathname, locale]);

  useEffect(() => {
    if (typeof window === 'undefined' || dntEnabled()) return;

    const flush = () => {
      if (queue.current.length === 0) return;
      const batch = queue.current.splice(0, MAX_QUEUE);
      const { anonymousId, sessionId } = getIds();
      const body = JSON.stringify({ anonymousId, sessionId, events: batch });
      try {
        if (navigator.sendBeacon) {
          const blob = new Blob([body], { type: 'application/json' });
          navigator.sendBeacon('/api/behavior/track', blob);
        } else {
          void fetch('/api/behavior/track', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body,
            keepalive: true,
          }).catch(() => null);
        }
      } catch {
        /* offline — drop */
      }
    };

    const onClick = (ev: MouseEvent) => {
      const now = Date.now();
      if (now - lastClickAt.current < 350) return; // throttle bursts
      lastClickAt.current = now;
      const el = ev.target as HTMLElement | null;
      if (!el || !(el instanceof HTMLElement)) return;
      // Ignore clicks inside the ERP heatmap overlay itself
      if (el.closest('[data-heatmap-overlay]')) return;
      const xPct = (ev.clientX / Math.max(1, window.innerWidth)) * 100;
      const yPct = (ev.clientY / Math.max(1, window.innerHeight)) * 100;
      queue.current.push({
        type: 'CLICK',
        route: window.location.pathname,
        locale,
        xPct: Math.round(xPct * 10) / 10,
        yPct: Math.round(yPct * 10) / 10,
        selector: safeSelector(el),
        viewportW: window.innerWidth,
        viewportH: window.innerHeight,
        ts: now,
      });
      if (queue.current.length >= MAX_QUEUE) flush();
    };

    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - window.innerHeight;
      if (max <= 0) return;
      const pct = Math.round((window.scrollY / max) * 100);
      const milestone = pct >= 100 ? 100 : pct >= 75 ? 75 : pct >= 50 ? 50 : pct >= 25 ? 25 : 0;
      if (milestone === 0 || sentScroll.current.has(milestone)) return;
      sentScroll.current.add(milestone);
      queue.current.push({
        type: 'SCROLL_DEPTH',
        route: window.location.pathname,
        locale,
        scrollPct: milestone as 25 | 50 | 75 | 100,
        viewportW: window.innerWidth,
        viewportH: window.innerHeight,
        ts: Date.now(),
      });
    };

    let scrollTick = false;
    const onScrollRaf = () => {
      if (scrollTick) return;
      scrollTick = true;
      requestAnimationFrame(() => {
        scrollTick = false;
        onScroll();
      });
    };

    const timer = window.setInterval(flush, FLUSH_MS);
    window.addEventListener('beforeunload', flush);
    document.addEventListener('click', onClick, { passive: true, capture: true });
    window.addEventListener('scroll', onScrollRaf, { passive: true });

    return () => {
      window.clearInterval(timer);
      window.removeEventListener('beforeunload', flush);
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('scroll', onScrollRaf);
      flush();
    };
  }, [locale]);

  return null;
}
