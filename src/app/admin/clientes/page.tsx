"use client";

import { createClient } from '@/utils/supabase/client';
import { useEffect, useMemo, useState } from 'react';

type CustomerOrder = {
  id: string;
  user_id: string | null;
  total_amount: number;
  status: string;
  created_at: string;
  customer_name: string | null;
  customer_phone: string | null;
  delivery_type: string;
  order_items: Array<{
    quantity: number;
    product_name: string | null;
  }> | null;
};

type CustomerSummary = {
  key: string;
  userId: string | null;
  name: string;
  phone: string | null;
  orders: CustomerOrder[];
  totalSpent: number;
  averageTicket: number;
  lastOrderAt: string;
  favoriteProduct: string;
};

function formatMoney(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function normalizeSearch(value: string | null | undefined) {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function getWhatsAppUrl(phone: string | null, name: string) {
  const digits = (phone || '').replace(/\D/g, '');
  if (!digits) return null;

  const normalizedPhone = digits.startsWith('55') ? digits : `55${digits}`;
  const message = `Ola, ${name}! Aqui e da Allvino.`;
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}

function getCustomerKey(order: CustomerOrder) {
  return order.user_id || order.customer_phone || order.customer_name || order.id;
}

function getFavoriteProduct(orders: CustomerOrder[]) {
  const counts = new Map<string, number>();

  orders.forEach((order) => {
    order.order_items?.forEach((item) => {
      const name = item.product_name || 'Produto removido';
      counts.set(name, (counts.get(name) || 0) + item.quantity);
    });
  });

  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'Sem historico';
}

export default function AdminClientesPage() {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [selectedCustomerKey, setSelectedCustomerKey] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadCustomers = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    const supabase = createClient();
    const { data, error } = await supabase
      .from('orders')
      .select('id,user_id,total_amount,status,created_at,customer_name,customer_phone,delivery_type,order_items(quantity,product_name)')
      .order('created_at', { ascending: false })
      .limit(300);

    if (error) {
      setErrorMessage('Nao foi possivel carregar clientes.');
      setIsLoading(false);
      return;
    }

    const nextOrders = (data || []) as CustomerOrder[];
    setOrders(nextOrders);
    setSelectedCustomerKey((current) => current || (nextOrders[0] ? getCustomerKey(nextOrders[0]) : null));
    setIsLoading(false);
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const customers = useMemo(() => {
    const groups = new Map<string, CustomerOrder[]>();

    orders.forEach((order) => {
      const key = getCustomerKey(order);
      groups.set(key, [...(groups.get(key) || []), order]);
    });

    return [...groups.entries()]
      .map(([key, customerOrders]): CustomerSummary => {
        const sortedOrders = [...customerOrders].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        const firstOrder = sortedOrders[0];
        const totalSpent = sortedOrders.reduce((total, order) => total + order.total_amount, 0);

        return {
          key,
          userId: firstOrder.user_id,
          name: firstOrder.customer_name || 'Cliente sem nome',
          phone: firstOrder.customer_phone,
          orders: sortedOrders,
          totalSpent,
          averageTicket: sortedOrders.length > 0 ? totalSpent / sortedOrders.length : 0,
          lastOrderAt: firstOrder.created_at,
          favoriteProduct: getFavoriteProduct(sortedOrders),
        };
      })
      .sort((a, b) => new Date(b.lastOrderAt).getTime() - new Date(a.lastOrderAt).getTime());
  }, [orders]);

  const filteredCustomers = useMemo(() => {
    const normalizedSearch = normalizeSearch(searchTerm.trim());
    if (!normalizedSearch) return customers;

    return customers.filter((customer) =>
      normalizeSearch([customer.name, customer.phone, customer.favoriteProduct].join(' ')).includes(normalizedSearch)
    );
  }, [customers, searchTerm]);

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.key === selectedCustomerKey) || filteredCustomers[0] || null,
    [customers, filteredCustomers, selectedCustomerKey]
  );

  const summary = useMemo(() => {
    const totalSpent = customers.reduce((total, customer) => total + customer.totalSpent, 0);
    const totalOrders = customers.reduce((total, customer) => total + customer.orders.length, 0);

    return {
      totalCustomers: customers.length,
      totalOrders,
      totalSpent,
      averageTicket: totalOrders > 0 ? totalSpent / totalOrders : 0,
    };
  }, [customers]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <h1 className="text-3xl font-bold font-serif text-black">Clientes</h1>
          <p className="mt-1 text-sm font-bold text-stone-500">Acompanhe historico, gasto total e recompra.</p>
        </div>
        <button
          type="button"
          onClick={loadCustomers}
          className="flex items-center gap-2 rounded-lg bg-black px-5 py-2.5 text-sm font-bold text-white transition hover:bg-stone-800"
        >
          <span className="material-symbols-outlined text-[18px]">refresh</span>
          Atualizar
        </button>
      </div>

      {errorMessage && (
        <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-lg bg-black p-5 text-white shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-widest text-white/60">Clientes</p>
          <p className="mt-2 text-3xl font-bold">{isLoading ? '...' : summary.totalCustomers}</p>
        </div>
        <div className="rounded-lg border border-stone-100 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-widest text-stone-400">Pedidos</p>
          <p className="mt-2 text-3xl font-bold text-black">{isLoading ? '...' : summary.totalOrders}</p>
        </div>
        <div className="rounded-lg border border-stone-100 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-widest text-stone-400">Faturamento</p>
          <p className="mt-2 text-xl font-bold text-black">{isLoading ? '...' : formatMoney(summary.totalSpent)}</p>
        </div>
        <div className="rounded-lg border border-stone-100 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-widest text-stone-400">Ticket medio</p>
          <p className="mt-2 text-xl font-bold text-black">{isLoading ? '...' : formatMoney(summary.averageTicket)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="overflow-hidden rounded-lg border border-stone-100 bg-white shadow-sm">
          <div className="space-y-4 border-b border-stone-100 px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-bold text-black">Base de clientes</h2>
              <span className="text-xs font-bold text-stone-400">{filteredCustomers.length} clientes encontrados</span>
            </div>
            <label className="relative block">
              <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-stone-400">
                search
              </span>
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar por cliente, telefone ou produto favorito"
                className="h-11 w-full rounded-lg border border-stone-200 bg-white pl-10 pr-3 text-sm font-bold text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-black"
              />
            </label>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-sm font-bold text-stone-400">Carregando clientes...</div>
          ) : filteredCustomers.length === 0 ? (
            <div className="p-8 text-center text-sm font-bold text-stone-400">Nenhum cliente encontrado.</div>
          ) : (
            <div className="divide-y divide-stone-100">
              {filteredCustomers.map((customer) => {
                const isSelected = selectedCustomer?.key === customer.key;

                return (
                  <button
                    key={customer.key}
                    type="button"
                    onClick={() => setSelectedCustomerKey(customer.key)}
                    className={`grid w-full grid-cols-1 gap-3 p-5 text-left transition md:grid-cols-[minmax(0,1fr)_140px_140px] md:items-center ${
                      isSelected ? 'bg-stone-50' : 'hover:bg-stone-50'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-black">{customer.name}</p>
                      <p className="mt-1 truncate text-xs font-bold text-stone-400">{customer.phone || 'Telefone nao informado'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-stone-400">Pedidos</p>
                      <p className="text-sm font-bold text-black">{customer.orders.length}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-stone-400">Total</p>
                      <p className="text-sm font-bold text-black">{formatMoney(customer.totalSpent)}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <aside className="rounded-lg border border-stone-100 bg-white p-5 shadow-sm xl:sticky xl:top-24 xl:self-start">
          {!selectedCustomer ? (
            <div className="py-10 text-center text-sm font-bold text-stone-400">Selecione um cliente.</div>
          ) : (
            <div className="space-y-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-stone-400">Cliente</p>
                <h2 className="mt-1 text-xl font-bold text-black">{selectedCustomer.name}</h2>
                <p className="mt-1 text-sm font-bold text-stone-500">{selectedCustomer.phone || 'Telefone nao informado'}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-stone-50 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Total gasto</p>
                  <p className="mt-1 text-lg font-bold text-black">{formatMoney(selectedCustomer.totalSpent)}</p>
                </div>
                <div className="rounded-lg bg-stone-50 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Ticket medio</p>
                  <p className="mt-1 text-lg font-bold text-black">{formatMoney(selectedCustomer.averageTicket)}</p>
                </div>
              </div>

              <div className="rounded-lg bg-stone-50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Produto favorito</p>
                <p className="mt-1 text-sm font-bold text-black">{selectedCustomer.favoriteProduct}</p>
              </div>

              {getWhatsAppUrl(selectedCustomer.phone, selectedCustomer.name) && (
                <a
                  href={getWhatsAppUrl(selectedCustomer.phone, selectedCustomer.name)!}
                  target="_blank"
                  rel="noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3 text-sm font-bold text-white transition hover:bg-[#1FAF55]"
                >
                  <span className="material-symbols-outlined text-[18px]">chat</span>
                  Chamar no WhatsApp
                </a>
              )}

              <div>
                <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-stone-400">Historico</h3>
                <div className="space-y-3">
                  {selectedCustomer.orders.map((order) => (
                    <div key={order.id} className="rounded-lg border border-stone-100 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-black">#{order.id.slice(0, 8)}</p>
                          <p className="text-xs font-bold text-stone-400">{new Date(order.created_at).toLocaleString('pt-BR')}</p>
                        </div>
                        <p className="text-sm font-bold text-black">{formatMoney(order.total_amount)}</p>
                      </div>
                      <p className="mt-2 text-xs font-bold text-stone-500">{order.delivery_type}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
