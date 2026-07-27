import { CurrentUser } from '@/lib/auth/userProfile';
export type { CurrentUser } from '@/lib/auth/userProfile';

export async function getCurrentUserFast(): Promise<CurrentUser | null> {
  const response = await fetch('/api/cliente/perfil', {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error('Nao foi possivel carregar o perfil.');
  }

  const payload = await response.json() as { user?: CurrentUser };
  return payload.user || null;
}
