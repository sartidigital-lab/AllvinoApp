'use client';

import { useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { registerPushSubscription } from '@/lib/push/client';

export function PushSubscriptionManager() {
  useEffect(() => {
    const supabase = createClient();
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') window.setTimeout(() => void sync(), 0);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);
  return null;
}
