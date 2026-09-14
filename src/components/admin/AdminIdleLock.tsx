'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from '@/i18n/routing';
import { logoutUser } from '@/actions/auth';

const DEFAULT_IDLE_TIMEOUT_MS = 15 * 60 * 1000;
const CHECK_INTERVAL_MS = 30 * 1000;

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'] as const;

/**
 * ERP idle lock: signs the admin out after a configurable period without any
 * interaction, so an unattended back-office session on a shared terminal cannot
 * be used by the next person at the desk. Renders nothing; server-side RBAC
 * remains the real enforcement (this only closes the session).
 */
export function AdminIdleLock({ timeoutMs = DEFAULT_IDLE_TIMEOUT_MS }: { timeoutMs?: number }) {
  const router = useRouter();
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
          await logoutUser();
        } catch {
          // Session may already be gone — the auth gate re-runs on navigation.
        }
        router.replace('/auth');
        router.refresh();
      })();
    }, CHECK_INTERVAL_MS);

    return () => {
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, bumpActivity));
      window.clearInterval(timer);
    };
  }, [router, timeoutMs]);

  return null;
}
