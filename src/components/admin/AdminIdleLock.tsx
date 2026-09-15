'use client';

import { useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';

const DEFAULT_IDLE_TIMEOUT_MS =
  process.env.NODE_ENV !== 'production' ? 60 * 60 * 1000 : 30 * 60 * 1000;
const CHECK_INTERVAL_MS = 30 * 1000;

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'] as const;

/**
 * ERP idle lock: signs the admin out after a configurable period without any
 * interaction, so an unattended back-office session on a shared terminal cannot
 * be used by the next person at the desk. Renders nothing; server-side RBAC
 * remains the real enforcement (this only closes the session).
 *
 * NOTE: intentionally uses plain `next/navigation` + `next-auth/react` here
 * instead of the locale-aware `@/i18n/routing` router and `@/actions/*`
 * server actions — this component renders at the top of the admin layout and
 * must never pull next-intl hook context or heavy server-action graphs into
 * the layout SSR path (that broke admin SSR with "No intl context found").
 */
export function AdminIdleLock({ timeoutMs = DEFAULT_IDLE_TIMEOUT_MS }: { timeoutMs?: number }) {
  const router = useRouter();
  const params = useParams<{ locale?: string }>();
  const locale = params?.locale || 'fa';
  const lastActivityRef = useRef<number>(0);

  useEffect(() => {
    lastActivityRef.current = Date.now();

    const bumpActivity = () => {
      lastActivityRef.current = Date.now();
    };

    ACTIVITY_EVENTS.forEach((event) =>
      window.addEventListener(event, bumpActivity, { passive: true })
    );

    const timer = window.setInterval(() => {
      if (Date.now() - lastActivityRef.current < timeoutMs) return;
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, bumpActivity));
      void (async () => {
        try {
          await signOut({ redirect: false });
        } catch {
          // Session may already be gone — the auth gate re-runs on navigation.
        }
        try {
          // Synchronize client-side store so expired session doesn't bounce back from /auth
          localStorage.removeItem('firuzo-auth');
        } catch {}
        router.replace(`/${locale}/auth?callbackUrl=/admin&reason=idle_timeout`);
        router.refresh();
      })();
    }, CHECK_INTERVAL_MS);

    return () => {
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, bumpActivity));
      window.clearInterval(timer);
    };
  }, [router, locale, timeoutMs]);

  return null;
}
