'use client';

import { useEffect, useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { useAuthStore } from '@/stores/auth-store';
import { getSessionUser } from '@/actions/auth';
import { getQueryClient } from '@/lib/query-client';
import { initAnalytics } from '@/lib/analytics';

/**
 * Restores the client auth store from the server session on mount. A valid
 * NextAuth session cookie must be enough to use auth-gated surfaces (checkout,
 * account) even when localStorage was cleared — otherwise a signed-in user on
 * a new device would be asked to sign in again by client-side gates.
 */
export function SessionBootstrap() {
  useEffect(() => {
    const { user } = useAuthStore.getState();
    if (user && user.phone) return;
    getSessionUser()
      .then((res) => {
        if (res.success && res.user) {
          useAuthStore.setState({
            user: res.user,
            kyc: { step: 'approved', phone: res.user.phone },
          });
        }
      })
      .catch(() => null);
  }, []);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  // One QueryClient per browser session (singleton); SSR gets a fresh client
  // per request inside getQueryClient(). useState preserves identity.
  const [queryClient] = useState(getQueryClient);

  useEffect(() => {
    // Privacy-safe funnel analytics: no-op without NEXT_PUBLIC_POSTHOG_KEY,
    // honors Do-Not-Track, never receives PII (see src/lib/analytics.ts).
    initAnalytics();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem={false}
        scriptProps={{ async: true }}
      >
        <SessionBootstrap />
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
}
