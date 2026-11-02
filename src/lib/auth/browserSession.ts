import type { CurrentUser } from '@/lib/auth/userProfile';

export const AUTH_STATE_EVENT = 'allvino:auth-state-changed';

export type BrowserSession = {
  user: CurrentUser;
  isAdmin: boolean;
};

export async function getBrowserSession(): Promise<BrowserSession | null> {
  const response = await fetch('/api/auth/session', {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });
  if (response.status === 401) return null;
  if (!response.ok) throw new Error('Não foi possível validar a sessão.');
  return response.json() as Promise<BrowserSession>;
}

export function announceAuthStateChange() {
  window.dispatchEvent(new Event(AUTH_STATE_EVENT));
}
