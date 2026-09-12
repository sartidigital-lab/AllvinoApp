"use client";

import Sidebar from '@/components/admin/Sidebar';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isDenied, setIsDenied] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/?login=true&redirectTo=/admin');
        return;
      }

      const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin');

      if (adminError || isAdmin !== true) {
        setIsDenied(true);
        return;
      }

      setIsAuthenticated(true);
    };

    checkAuth();
  }, [router]);

  if (isDenied) {
    return (
      <div className="admin-shell flex min-h-screen items-center justify-center px-6">
        <div className="admin-surface max-w-md space-y-3 p-6 text-center">
          <h1 className="text-2xl font-bold font-serif text-black">Acesso restrito</h1>
          <p className="text-sm font-bold text-stone-500">O painel administrativo exige permissões de administrador.</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="admin-shell flex min-h-screen items-center justify-center px-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1B1917] text-white shadow-xl">
            <span className="material-symbols-outlined animate-pulse">wine_bar</span>
          </span>
          <div>
            <p className="font-serif text-xl font-bold text-stone-900">Abrindo a central</p>
            <p className="mt-1 text-sm font-bold text-stone-500">Validando seu acesso administrativo...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-shell overflow-x-hidden">
      <Sidebar />
      <div className="relative transition-all duration-300 ease-in-out lg:ml-72">
        <main className="mx-auto w-full max-w-[1680px] px-4 py-5 sm:px-6 sm:py-7 lg:px-9 lg:py-8 2xl:px-12">
          <div className="admin-page-enter">{children}</div>
        </main>
      </div>
    </div>
  );
}
