'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Web Push subscription hook (پوش نوتیفیکیشن).
 * Bootstraps the VAPID public key from /api/push/subscribe (GET), registers
 * the subscription against the existing PWA service worker and keeps the
 * permission state in sync.
 */

interface PushState {
  supported: boolean;
  enabled: boolean; // server-side VAPID configured
  permission: NotificationPermission | 'unsupported';
  subscribed: boolean;
  loading: boolean;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

export function usePushNotifications(locale: string = 'fa') {
  const [state, setState] = useState<PushState>({
    supported: false,
    enabled: false,
    permission: 'unsupported',
    subscribed: false,
    loading: true,
  });

  const refresh = useCallback(async () => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      setState((s) => ({ ...s, supported: false, permission: 'unsupported', loading: false }));
      return;
    }
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const existing = reg ? await reg.pushManager.getSubscription() : null;
      let enabled = false;
      try {
        const res = await fetch('/api/push/subscribe');
        const data = await res.json();
        enabled = Boolean(data.enabled && data.publicKey);
      } catch {
        enabled = false;
      }
      setState({
        supported: true,
        enabled,
        permission: Notification.permission,
        subscribed: Boolean(existing),
        loading: false,
      });
    } catch {
      setState((s) => ({ ...s, loading: false }));
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined') return false;
    try {
      const permission = await Notification.requestPermission();
      setState((s) => ({ ...s, permission }));
      if (permission !== 'granted') return false;

      const reg = await navigator.serviceWorker.ready;
      let key: string | null = null;
      try {
        const res = await fetch('/api/push/subscribe');
        const data = await res.json();
        key = data.publicKey || null;
      } catch {
        key = null;
      }
      if (!key) return false;

      const existing = await reg.pushManager.getSubscription();
      const sub =
        existing ||
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(key) as unknown as BufferSource,
        }));

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON(), locale }),
      });
      const ok = res.ok;
      await refresh();
      return ok;
    } catch (err) {
      console.error('[push] subscribe failed:', err);
      await refresh();
      return false;
    }
  }, [locale, refresh]);

  const unsubscribe = useCallback(async (): Promise<void> => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint }),
        }).catch(() => {});
      }
    } finally {
      await refresh();
    }
  }, [refresh]);

  return { ...state, subscribe, unsubscribe, refresh };
}
