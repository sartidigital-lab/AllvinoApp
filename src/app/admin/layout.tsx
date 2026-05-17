"use client";

import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Sidebar from '@/components/admin/Sidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.replace('/auth/login?redirectTo=/admin');
      } else {
        setIsAuthenticated(true);
      }
    };

    checkAuth();
  }, [router]);

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
