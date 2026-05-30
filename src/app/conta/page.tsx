"use client";

import { createClient } from '@/utils/supabase/client';
import { CurrentUser, getCurrentUserFast } from '@/lib/auth/currentUser';
import { getUserOrders } from '@/lib/database/orders';
import { Order } from '@/types/database';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function ContaPage() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [nascimento, setNascimento] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);

  useEffect(() => {
    const fetchUserAndOrders = async () => {
      const currentUser = await getCurrentUserFast();
      
      if (!currentUser) {
        router.replace('/auth/login?redirectTo=/conta');
        return;
      }
      
      setUser(currentUser);
      setNome(currentUser.name);
      setWhatsapp(currentUser.phone);
      setNascimento(currentUser.birthDate);

      const { orders } = await getUserOrders(currentUser.id);
      setOrders(orders);
      setIsLoadingOrders(false);
    };

    fetchUserAndOrders();
  }, [router]);

  const salvarPerfil = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      data: { 
        nome_completo: nome, 
        telefone: whatsapp,
        data_nascimento: nascimento
      }
    });

    if (error) {
      alert("Erro ao atualizar dados: " + error.message);
    } else {
      alert("Perfil atualizado com sucesso!");
    }

    setIsSaving(false);
  };

  const fazerLogout = async () => {
    if (confirm("Deseja realmente sair da sua conta?")) {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.replace('/auth/login');
    }
  };

  if (!user) {
    return <p className="text-center mt-20 animate-pulse font-bold text-stone-400">Carregando Perfil...</p>;
  }

  return (
    <main className="max-w-xl mx-auto px-5 pt-8 pb-32 space-y-6 animate-in fade-in duration-300">
      {/* CABEÇALHO DO PERFIL */}
      <div className="space-y-2 text-center mb-8">
        <div className="w-20 h-20 bg-stone-200 rounded-full mx-auto flex items-center justify-center mb-4">
          <span className="material-symbols-outlined text-4xl text-stone-400">person</span>
        </div>
        <h1 className="text-3xl font-bold font-serif text-black">{nome || 'Cliente Allvino'}</h1>
        <p className="text-stone-500 text-sm">{user.email}</p>
      </div>

      {/* HISTÓRICO DE COMPRAS */}
      <div className="bg-white rounded-3xl p-6 border border-stone-100 shadow-sm space-y-5">
        <h2 className="text-xs font-bold text-stone-400 uppercase tracking-widest border-b pb-2 flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]">receipt_long</span> Meus Pedidos
        </h2>
        {isLoadingOrders ? (
          <p className="text-sm text-stone-400 text-center py-4 font-bold animate-pulse">Buscando histórico...</p>
        ) : orders.length === 0 ? (
          <p className="text-sm text-stone-400 text-center py-4">Você ainda não fez nenhum pedido.</p>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <div key={order.id} className="p-4 border border-stone-100 rounded-2xl flex flex-col gap-2 hover:border-black transition">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">
                    {new Date(order.created_at).toLocaleDateString('pt-BR')}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest ${
                    order.status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-stone-100 text-stone-600'
                  }`}>
                    {order.status === 'pending' ? 'Pendente' : order.status}
                  </span>
                </div>
                <div className="flex justify-between items-end">
                  <span className="text-xs text-stone-500 line-clamp-1 flex-1 pr-4">{order.delivery_type}</span>
                  <span className="font-bold text-sm">R$ {order.total_amount.toFixed(2).replace('.', ',')}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FORMULÁRIO DE EDIÇÃO */}
      <div className="bg-white rounded-3xl p-6 border border-stone-100 shadow-sm space-y-5">
        <h2 className="text-xs font-bold text-stone-400 uppercase tracking-widest border-b pb-2 flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]">edit_document</span> Meus Dados
        </h2>
        
        <form onSubmit={salvarPerfil} className="space-y-4">
          <div>
            <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Nome Completo</label>
            <input 
              type="text" 
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required 
              className="w-full bg-white border border-stone-200 text-black rounded-xl py-3 px-4 outline-none focus:border-black transition-colors shadow-sm mt-1 text-sm font-bold" 
            />
          </div>
          
          <div>
            <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">E-mail (Bloqueado)</label>
            <input 
              type="email" 
              value={user.email} 
              readOnly 
              className="w-full bg-stone-50 border border-stone-200 text-stone-500 rounded-xl py-3 px-4 outline-none transition-colors shadow-sm mt-1 text-sm" 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">WhatsApp</label>
              <input 
                type="tel" 
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="(00) 00000-0000" 
                required 
                className="w-full bg-white border border-stone-200 text-black rounded-xl py-3 px-4 outline-none focus:border-black transition-colors shadow-sm mt-1 text-sm font-bold" 
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Data de Nascimento</label>
              <input 
                type="date" 
                value={nascimento}
                onChange={(e) => setNascimento(e.target.value)}
                className="w-full bg-white border border-stone-200 text-black rounded-xl py-3 px-4 outline-none focus:border-black transition-colors shadow-sm mt-1 text-sm font-bold" 
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isSaving}
            className="w-full bg-black text-white py-4 rounded-2xl font-bold text-sm active:scale-95 transition-transform shadow-lg mt-2 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSaving ? 'Salvando...' : <><span className="material-symbols-outlined text-[18px]">save</span> Salvar Alterações</>}
          </button>
        </form>
      </div>

      {/* ZONA DE SAÍDA */}
      <div className="pt-4">
        <button 
          onClick={fazerLogout} 
          className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl border border-red-100 bg-red-50 text-red-600 hover:bg-red-100 transition-colors active:scale-95 font-bold text-sm"
        >
          <span className="material-symbols-outlined text-[18px]">logout</span> Sair da minha conta
        </button>
      </div>
    </main>
  );
}
