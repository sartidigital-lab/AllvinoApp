'use client';

import { useEffect } from 'react';
import { registerPushSubscription } from '@/lib/push/client';
import { AUTH_STATE_EVENT } from '@/lib/auth/browserSession';

export function PushSubscriptionManager() {
  useEffect(() => {
    let active = true;
    let busy = false;
    const sync = async () => {
      if (!active || busy || !('Notification' in window) || Notification.permission !== 'granted') return;
      busy = true;
      try {
        await registerPushSubscription();
      } catch (error) {
        console.warn('Push subscription sync failed', error);
      } finally {
        busy = false;
      }
    };
    void sync();
    const onAuthChange = () => window.setTimeout(() => void sync(), 0);
    window.addEventListener(AUTH_STATE_EVENT, onAuthChange);
    return () => {
      active = false;
      window.removeEventListener(AUTH_STATE_EVENT, onAuthChange);
    };
  }, []);
  return null;
}
