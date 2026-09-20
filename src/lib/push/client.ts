import { createClient } from '@/utils/supabase/client';

const OWNER_KEY = 'allvino:push-owner:v1';

function getDeviceType(): 'desktop' | 'mobile' {
  return /android|iphone|ipod|ipad|mobile|iemobile|opera mini/i.test(navigator.userAgent)
    ? 'mobile'
    : 'desktop';
}

function decodeKey(key: string) {
  const padding = '='.repeat((4 - key.length % 4) % 4);
  const binary = atob((key + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export async function registerPushSubscription(): Promise<'subscribed' | 'login-required' | 'unavailable'> {
  if (!window.isSecureContext || !('serviceWorker' in navigator) || !('PushManager' in window) ||
      !('Notification' in window) || Notification.permission !== 'granted') return 'unavailable';

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 'login-required';

  const response = await fetch('/api/push/config', { cache: 'no-store' });
  if (!response.ok) return 'unavailable';
  const config = await response.json() as { available: boolean; publicKey: string | null };
  if (!config.available || !config.publicKey) return 'unavailable';

  const registration = await navigator.serviceWorker.register('/sw.js');
  let subscription = await registration.pushManager.getSubscription();
  const savedOwner = window.localStorage.getItem(OWNER_KEY);
  const requestedKey = decodeKey(config.publicKey);
  const currentKey = subscription?.options.applicationServerKey;
  const sameKey = currentKey && requestedKey.length === currentKey.byteLength &&
    requestedKey.every((value, index) => value === new Uint8Array(currentKey)[index]);
  if (subscription && (savedOwner && savedOwner !== user.id || !sameKey)) {
    await subscription.unsubscribe();
    subscription = null;
  }

  subscription ||= await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: requestedKey });
  const save = (current: PushSubscription) => fetch('/api/push/subscription', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...current.toJSON(), deviceType: getDeviceType() }),
  });
  let saveResponse = await save(subscription);
  if (saveResponse.status === 409) {
    await subscription.unsubscribe();
    subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: requestedKey });
    saveResponse = await save(subscription);
  }
  if (!saveResponse.ok) throw new Error('Não foi possível salvar a assinatura de notificações.');
  window.localStorage.setItem(OWNER_KEY, user.id);
  return 'subscribed';
}

export async function unregisterPushSubscription() {
  if (!('serviceWorker' in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration('/sw.js');
  const subscription = await registration?.pushManager.getSubscription();
  if (subscription) {
    const response = await fetch('/api/push/subscription', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    });
    if (!response.ok) throw new Error('Não foi possível remover a assinatura de notificações.');
    await subscription.unsubscribe();
  }
  window.localStorage.removeItem(OWNER_KEY);
}
