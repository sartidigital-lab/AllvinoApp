"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { CurrentUser, getCurrentUserFast } from '@/lib/auth/currentUser';
import { getUserOrders } from '@/lib/database/orders';
import { CartItem, useCart } from '@/context/CartContext';
import { OrderWithItems } from '@/types/database';

const statusLabels: Record<string, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  preparing: 'Em separacao',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

const statusSteps = ['pending', 'confirmed', 'preparing', 'delivered'];

function getStatusClass(status: string) {
  if (status === 'pending') return 'bg-amber-100 text-amber-800';
  if (status === 'confirmed') return 'bg-blue-100 text-blue-800';
  if (status === 'preparing') return 'bg-purple-100 text-purple-800';
  if (status === 'delivered') return 'bg-emerald-100 text-emerald-800';
  if (status === 'cancelled') return 'bg-red-100 text-red-800';
  return 'bg-stone-100 text-stone-600';
}

function getItemName(item: OrderWithItems['order_items'][number]) {
  return item.product_name || 'Produto removido';
}

export default function ContaPage() {
  const router = useRouter();
  const { addManyToCart } = useCart();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [nascimento, setNascimento] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);

  useEffect(() => {
    const fetchUserAndOrders = async () => {
      const currentUser = await getCurrentUserFast();

      if (!currentUser) {
        router.replace('/?login=true&redirectTo=/conta');
        return;
      }

      setUser(currentUser);
      setNome(currentUser.name);
      setWhatsapp(currentUser.phone);
      setNascimento(currentUser.birthDate);

      const { orders } = await getUserOrders(currentUser.id);
      setOrders(orders);
      setOpenOrderId(orders[0]?.id || null);
      setIsLoadingOrders(false);
    };

    fetchUserAndOrders();
  }, [router]);

  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === openOrderId) || null,
    [orders, openOrderId]
  );

  const repetirPedido = (order: OrderWithItems) => {
    const items = order.order_items.map((item): CartItem => ({
      id: item.product_id || item.wine_id || item.id,
      name: getItemName(item),
      description: null,
      price: item.unit_price,
      image_url: null,
      type: null,
      region: null,
      grape: null,
      category: 'Vinho',
      stock: 0,
      created_at: order.created_at,
      quantity: item.quantity,
    }));

    addManyToCart(items);
  };

  const salvarPerfil = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      data: {
        nome_completo: nome,
        telefone: whatsapp,
        data_nascimento: nascimento,
      },
    });

    if (error) {
      alert('Erro ao atualizar dados: ' + error.message);
    } else {
      alert('Perfil atualizado com sucesso!');
    }

    setIsSaving(false);
  };

  const fazerLogout = async () => {
    if (confirm('Deseja realmente sair da sua conta?')) {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.replace('/?login=true');
    }
  };

  if (!user) {
    return <p className="text-center mt-20 animate-pulse font-bold text-stone-400">Carregando Perfil...</p>;
  }

  return (
    <main className="max-w-xl mx-auto px-5 pt-8 pb-32 space-y-6 animate-in fade-in duration-300">
      <div className="space-y-2 text-center mb-8">
        <div className="w-20 h-20 bg-stone-200 rounded-full mx-auto flex items-center justify-center mb-4">
          <span className="material-symbols-outlined text-4xl text-stone-400">person</span>
        </div>
        <h1 className="text-3xl font-bold font-serif text-black">{nome || 'Cliente Allvino'}</h1>
        <p className="text-stone-500 text-sm">{user.email}</p>
      </div>

      <div className="bg-white rounded-3xl p-6 border border-stone-100 shadow-sm space-y-5">
        <h2 className="text-xs font-bold text-stone-400 uppercase tracking-widest border-b pb-2 flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]">receipt_long</span> Meus Pedidos
        </h2>
        {isLoadingOrders ? (
          <p className="text-sm text-stone-400 text-center py-4 font-bold animate-pulse">Buscando historico...</p>
        ) : orders.length === 0 ? (
          <p className="text-sm text-stone-400 text-center py-4">Voce ainda nao fez nenhum pedido.</p>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => {
              const isOpen = selectedOrder?.id === order.id;
              const currentStepIndex = statusSteps.indexOf(order.status);

              return (
                <div key={order.id} className="overflow-hidden rounded-2xl border border-stone-100 transition hover:border-black">
                  <button
                    type="button"
                    onClick={() => setOpenOrderId(isOpen ? null : order.id)}
                    className="flex w-full flex-col gap-2 p-4 text-left"
                  >
                    <div className="flex justify-between items-center gap-3">
                      <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">
                        {new Date(order.created_at).toLocaleDateString('pt-BR')} - #{order.id.slice(0, 8)}
                      </span>
                      <span className={`shrink-0 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest ${getStatusClass(order.status)}`}>
                        {statusLabels[order.status] || order.status}
                      </span>
                    </div>
                    <div className="flex justify-between items-end gap-4">
                      <span className="text-xs text-stone-500 line-clamp-1 flex-1">{order.delivery_type}</span>
                      <span className="font-bold text-sm">R$ {order.total_amount.toFixed(2).replace('.', ',')}</span>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="space-y-5 border-t border-stone-100 bg-stone-50 p-4">
                      <div className="grid grid-cols-4 gap-2">
                        {statusSteps.map((step, index) => {
                          const isDone = currentStepIndex >= index && order.status !== 'cancelled';

                          return (
                            <div key={step} className="space-y-1">
                              <div className={`h-1.5 rounded-full ${isDone ? 'bg-[#B91C1C]' : 'bg-stone-200'}`} />
                              <p className={`text-[9px] font-bold uppercase leading-tight ${isDone ? 'text-black' : 'text-stone-400'}`}>
                                {statusLabels[step]}
                              </p>
                            </div>
                          );
                        })}
                      </div>

                      <div className="space-y-2">
                        {order.order_items.map((item) => (
                          <div key={item.id} className="flex justify-between gap-3 rounded-xl bg-white p-3">
                            <div className="min-w-0">
                              <p className="line-clamp-2 text-sm font-bold text-black">{getItemName(item)}</p>
                              <p className="text-xs font-bold text-stone-400">
                                {item.quantity} x R$ {item.unit_price.toFixed(2).replace('.', ',')}
                              </p>
                            </div>
                            <p className="shrink-0 text-sm font-bold text-black">
                              R$ {(item.quantity * item.unit_price).toFixed(2).replace('.', ',')}
                            </p>
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => repetirPedido(order)}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-black py-3 text-sm font-bold text-white transition active:scale-95"
                      >
                        <span className="material-symbols-outlined text-[18px]">repeat</span>
                        Repetir pedido
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

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
              onChange={(event) => setNome(event.target.value)}
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
                onChange={(event) => setWhatsapp(event.target.value)}
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
                onChange={(event) => setNascimento(event.target.value)}
                className="w-full bg-white border border-stone-200 text-black rounded-xl py-3 px-4 outline-none focus:border-black transition-colors shadow-sm mt-1 text-sm font-bold"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full bg-black text-white py-4 rounded-2xl font-bold text-sm active:scale-95 transition-transform shadow-lg mt-2 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSaving ? 'Salvando...' : <><span className="material-symbols-outlined text-[18px]">save</span> Salvar Alteracoes</>}
          </button>
        </form>
      </div>

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
