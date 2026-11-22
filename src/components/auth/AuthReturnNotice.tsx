'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export function AuthReturnNotice() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const isAuthError = params.get('error') === 'auth-callback-failed';
  const isAdminError = params.get('admin') === 'unauthorized';
  if (!isAuthError && !isAdminError) return null;
  const dismiss = () => {
    const next = new URLSearchParams(params.toString());
    if (isAuthError) next.delete('error');
    if (isAdminError) next.delete('admin');
    router.replace(`${pathname}${next.size ? `?${next}` : ''}`, { scroll: false });
  };
  return <div role="alert" className="mx-auto mt-4 flex max-w-7xl items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"><span>{isAuthError ? 'Não foi possível concluir o acesso. Tente entrar novamente ou solicite um novo link.' : 'Sua conta não tem acesso ao painel administrativo.'}</span><button type="button" onClick={dismiss} className="shrink-0 font-bold underline">Fechar</button></div>;
}
