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
      <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7] px-6">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-2xl font-bold font-serif text-black">Acesso restrito</h1>
          <p className="text-sm font-bold text-stone-500">O painel administrativo exige permissoes de administrador.</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7]"><p className="animate-pulse font-bold">Verificando acesso...</p></div>;
  }

  return (
    <div className="text-black overflow-x-hidden min-h-screen bg-[#FDFBF7]">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300 ease-in-out relative">
        <main className="p-5 lg:p-8 max-w-7xl mx-auto pb-32 animate-in fade-in duration-500">
          {children}
        </main>
      </div>
    </div>
  );
}
