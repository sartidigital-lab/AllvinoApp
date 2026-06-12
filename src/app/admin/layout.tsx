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
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.replace('/?login=true&redirectTo=/admin');
        return;
      }

      if (session.user.app_metadata?.role !== 'admin') {
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
    return <div className="admin-shell flex min-h-screen items-center justify-center"><p className="animate-pulse font-bold">Verificando acesso...</p></div>;
  }

  return (
    <div className="admin-shell overflow-x-hidden">
      <Sidebar />
      <div className="relative transition-all duration-300 ease-in-out lg:ml-64">
        <main className="mx-auto w-full max-w-[1680px] px-4 py-5 pb-10 sm:px-5 lg:px-8 lg:py-7">
          {children}
        </main>
      </div>
    </div>
  );
}
