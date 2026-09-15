'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { getSessionUser } from '@/actions/auth';
import { initAnalytics } from '@/lib/analytics';
import { BehaviorTracker } from '@/components/analytics/BehaviorTracker';

/**
 * Restores the client auth store from the server session on mount. A valid
 * NextAuth session cookie must be enough to use auth-gated surfaces (checkout,
 * account) even when localStorage was cleared — otherwise a signed-in user on
 * a new device would be asked to sign in again by client-side gates.
 */
export function SessionBootstrap() {
  useEffect(() => {
    getSessionUser()
      .then((res) => {
        if (res.success && res.user) {
          useAuthStore.setState({
            user: res.user,
            kyc: {
              step: 'approved',
              phone: res.user.phone,
            },
          });
        } else {
          // If server session is gone, clear phantom staff/admin state so UI doesn't claim active access
          const currentUser = useAuthStore.getState().user;
          if (currentUser && ['admin', 'ADMIN', 'SUPER_ADMIN', 'OPS', 'FINANCE'].includes(currentUser.role)) {
            useAuthStore.getState().logout();
          }
        }
      })
      .catch(() => null);
  }, []);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Privacy-safe funnel analytics: no-op without NEXT_PUBLIC_POSTHOG_KEY,
    // honors Do-Not-Track, never receives PII (see src/lib/analytics.ts).
    initAnalytics();
  }, []);

  return (
    <>
      <SessionBootstrap />
      <BehaviorTracker />
      {children}
    </>
  );
}
