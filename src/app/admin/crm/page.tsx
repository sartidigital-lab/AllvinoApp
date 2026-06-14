"use client";

import { DragEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AdminEmptyState, AdminNotice, AdminPageHeader, AdminStatCard, AdminStatusBadge } from '@/components/admin/AdminPrimitives';
import { createClient } from '@/utils/supabase/client';
import { CustomerCrmCard, CustomerCrmPriority, CustomerCrmStage } from '@/types/database';

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

type KanbanCustomer = {
  key: string;
  userId: string | null;
  name: string;
  phone: string | null;
  stage: CustomerCrmStage;
  priority: CustomerCrmPriority;
  notes: string;
  nextActionAt: string | null;
  lastContactedAt: string | null;
  orders: CustomerOrder[];
  totalSpent: number;
  averageTicket: number;
  lastOrderAt: string;
  favoriteProduct: string;
};

const stages: Array<{
  id: CustomerCrmStage;
  label: string;
  icon: string;
  hint: string;
  className: string;
}> = [
  { id: 'novo', label: 'Novo cliente', icon: 'fiber_new', hint: 'Primeira compra ou lead recente', className: 'border-sky-100 bg-sky-50/40' },
  { id: 'contato', label: 'Contato', icon: 'forum', hint: 'Precisa de abordagem no WhatsApp', className: 'border-amber-100 bg-amber-50/40' },
  { id: 'negociacao', label: 'Negociação', icon: 'handshake', hint: 'Oferta, recorrência ou cesta em curso', className: 'border-violet-100 bg-violet-50/40' },
  { id: 'pedido', label: 'Pedido em andamento', icon: 'local_mall', hint: 'Pedido aberto ou em preparação', className: 'border-blue-100 bg-blue-50/40' },
  { id: 'pos_venda', label: 'Pós-venda', icon: 'workspace_premium', hint: 'Recompra e relacionamento', className: 'border-emerald-100 bg-emerald-50/40' },
];

const priorityLabels: Record<CustomerCrmPriority, string> = {
  baixa: 'Baixa',
  normal: 'Normal',
  alta: 'Alta',
};

const priorityTones: Record<CustomerCrmPriority, 'neutral' | 'success' | 'warning' | 'danger' | 'info'> = {
  baixa: 'neutral',
  normal: 'info',
  alta: 'danger',
};

const cardSelect = 'id,customer_key,user_id,customer_name,customer_phone,stage,priority,notes,next_action_at,last_contacted_at,created_at,updated_at';

function formatMoney(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function normalizeSearch(value: string | null | undefined) {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function normalizePhone(value: string | null | undefined) {
  return (value || '').replace(/\D/g, '');
}

function getWhatsAppUrl(phone: string | null, name: string) {
  const digits = normalizePhone(phone);
  if (!digits) return null;

  const normalizedPhone = digits.startsWith('55') ? digits : `55${digits}`;
  const message = `Olá, ${name}! Aqui é da Allvino.`;
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}

function getConversationHref(customerKey: string) {
  return `/admin/conversas?customer=${encodeURIComponent(customerKey)}`;
}

function getCustomerKey(order: CustomerOrder) {
  if (order.user_id) return `user:${order.user_id}`;

  const phone = normalizePhone(order.customer_phone);
  if (phone) return `phone:${phone}`;

  const name = normalizeSearch(order.customer_name).replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  if (name) return `name:${name}`;

  return `order:${order.id}`;
}

function getFavoriteProduct(orders: CustomerOrder[]) {
  const counts = new Map<string, number>();

  orders.forEach((order) => {
    order.order_items?.forEach((item) => {
      const name = item.product_name || 'Produto removido';
      counts.set(name, (counts.get(name) || 0) + item.quantity);
    });
  });

  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'Sem histórico';
}

function inferStage(orders: CustomerOrder[]): CustomerCrmStage {
  const latest = orders[0];
  if (['pending', 'confirmed', 'preparing'].includes(latest?.status || '')) return 'pedido';
  if (orders.length >= 2) return 'pos_venda';
  return 'novo';
}

function isDueTodayOrOverdue(value: string | null) {
  if (!value) return false;
  const actionDate = new Date(value);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  return actionDate.getTime() <= endOfToday.getTime();
}

function formatDateTime(value: string | null) {
  if (!value) return 'Sem próxima ação';
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminCrmPage() {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [crmCards, setCrmCards] = useState<CustomerCrmCard[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'all' | CustomerCrmPriority>('all');
  const [selectedCustomerKey, setSelectedCustomerKey] = useState<string | null>(null);
  const [draggedCustomerKey, setDraggedCustomerKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadCrm = async () => {
    setIsLoading(true);
    setMessage(null);

    const supabase = createClient();
    const [ordersResult, cardsResult] = await Promise.all([
      supabase
        .from('orders')
        .select('id,user_id,total_amount,status,created_at,customer_name,customer_phone,delivery_type,order_items(quantity,product_name)')
        .order('created_at', { ascending: false })
        .limit(500),
      supabase
        .from('customer_crm_cards')
        .select(cardSelect)
        .order('updated_at', { ascending: false }),
    ]);

    if (ordersResult.error || cardsResult.error) {
      setMessage('Não foi possível carregar o CRM.');
      setIsLoading(false);
      return;
    }

    setOrders((ordersResult.data || []) as CustomerOrder[]);
    setCrmCards((cardsResult.data || []) as CustomerCrmCard[]);
    setIsLoading(false);
  };

  useEffect(() => {
    loadCrm();
  }, []);

  const customers = useMemo(() => {
    const groups = new Map<string, CustomerOrder[]>();
    const cardByKey = new Map(crmCards.map((card) => [card.customer_key, card]));

    orders.forEach((order) => {
      const key = getCustomerKey(order);
      groups.set(key, [...(groups.get(key) || []), order]);
    });

    return [...groups.entries()]
      .map(([key, customerOrders]): KanbanCustomer => {
        const sortedOrders = [...customerOrders].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        const firstOrder = sortedOrders[0];
        const totalSpent = sortedOrders.reduce((total, order) => total + order.total_amount, 0);
        const crmCard = cardByKey.get(key);

        return {
          key,
          userId: firstOrder.user_id,
          name: crmCard?.customer_name || firstOrder.customer_name || 'Cliente sem nome',
          phone: crmCard?.customer_phone || firstOrder.customer_phone,
          stage: crmCard?.stage || inferStage(sortedOrders),
          priority: crmCard?.priority || 'normal',
          notes: crmCard?.notes || '',
          nextActionAt: crmCard?.next_action_at || null,
          lastContactedAt: crmCard?.last_contacted_at || null,
          orders: sortedOrders,
          totalSpent,
          averageTicket: sortedOrders.length > 0 ? totalSpent / sortedOrders.length : 0,
          lastOrderAt: firstOrder.created_at,
          favoriteProduct: getFavoriteProduct(sortedOrders),
        };
      })
      .sort((a, b) => {
        if (a.priority === 'alta' && b.priority !== 'alta') return -1;
        if (a.priority !== 'alta' && b.priority === 'alta') return 1;
        return new Date(b.lastOrderAt).getTime() - new Date(a.lastOrderAt).getTime();
      });
  }, [crmCards, orders]);

  const filteredCustomers = useMemo(() => {
    const normalizedSearch = normalizeSearch(searchTerm.trim());

    return customers.filter((customer) => {
      const matchesPriority = priorityFilter === 'all' || customer.priority === priorityFilter;
      const searchable = normalizeSearch([customer.name, customer.phone, customer.favoriteProduct, customer.notes].join(' '));
      const matchesSearch = !normalizedSearch || searchable.includes(normalizedSearch);
      return matchesPriority && matchesSearch;
    });
  }, [customers, priorityFilter, searchTerm]);

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.key === selectedCustomerKey) || null,
    [customers, selectedCustomerKey]
  );

  const summary = useMemo(() => {
    return {
      total: customers.length,
      highPriority: customers.filter((customer) => customer.priority === 'alta').length,
      due: customers.filter((customer) => isDueTodayOrOverdue(customer.nextActionAt)).length,
      revenue: customers.reduce((total, customer) => total + customer.totalSpent, 0),
    };
  }, [customers]);

  const upsertCustomerCard = async (customer: KanbanCustomer, updates: Partial<CustomerCrmCard>) => {
    setUpdatingKey(customer.key);
    setMessage(null);

    const supabase = createClient();
    const nextRecord = {
      customer_key: customer.key,
      user_id: customer.userId,
      customer_name: customer.name,
      customer_phone: customer.phone,
      stage: updates.stage || customer.stage,
      priority: updates.priority || customer.priority,
      notes: updates.notes === undefined ? customer.notes || null : updates.notes,
      next_action_at: updates.next_action_at === undefined ? customer.nextActionAt : updates.next_action_at,
      last_contacted_at: updates.last_contacted_at === undefined ? customer.lastContactedAt : updates.last_contacted_at,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('customer_crm_cards')
      .upsert(nextRecord, { onConflict: 'customer_key' })
      .select(cardSelect)
      .single();

    if (error) {
      setMessage('Não foi possível atualizar o card do CRM.');
      setUpdatingKey(null);
      return;
    }

    const savedCard = data as CustomerCrmCard;
    setCrmCards((current) => {
      const withoutCard = current.filter((card) => card.customer_key !== savedCard.customer_key);
      return [savedCard, ...withoutCard];
    });
    setUpdatingKey(null);
  };

  const moveCustomer = async (customer: KanbanCustomer, stage: CustomerCrmStage) => {
    if (customer.stage === stage) return;
    await upsertCustomerCard(customer, { stage });
  };

  const handleDrop = async (event: DragEvent<HTMLDivElement>, stage: CustomerCrmStage) => {
    event.preventDefault();
    const customerKey = draggedCustomerKey || event.dataTransfer.getData('text/plain');
    const customer = customers.find((item) => item.key === customerKey);
    setDraggedCustomerKey(null);
    if (!customer) return;
    await moveCustomer(customer, stage);
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="CRM Kanban"
        description="Acompanhe contatos, recompra e oportunidades pelo WhatsApp."
        actions={(
          <button
            type="button"
            onClick={loadCrm}
            className="admin-button flex items-center gap-2 bg-black px-5 text-sm text-white transition hover:bg-stone-800"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            Atualizar
          </button>
        )}
      />

      {message && (
        <AdminNotice>{message}</AdminNotice>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard label="Clientes no CRM" value={isLoading ? '...' : summary.total} icon="groups" tone="dark" />
        <AdminStatCard label="Alta prioridade" value={isLoading ? '...' : summary.highPriority} icon="priority_high" tone="accent" />
        <AdminStatCard label="Ações até hoje" value={isLoading ? '...' : summary.due} icon="event_upcoming" />
        <AdminStatCard label="Receita histórica" value={isLoading ? '...' : formatMoney(summary.revenue)} icon="monitoring" />
      </div>

      <div className="admin-surface flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
        <label className="relative min-w-0 flex-1">
          <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-stone-400">search</span>
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar por cliente, telefone, produto ou nota"
            className="h-11 w-full rounded-lg border border-stone-200 bg-white pl-10 pr-3 text-sm font-bold text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-black"
          />
        </label>
        <select
          value={priorityFilter}
          onChange={(event) => setPriorityFilter(event.target.value as 'all' | CustomerCrmPriority)}
          className="h-11 rounded-lg border border-stone-200 bg-white px-3 text-sm font-bold text-stone-700 outline-none focus:border-black"
        >
          <option value="all">Todas prioridades</option>
          <option value="alta">Alta prioridade</option>
          <option value="normal">Prioridade normal</option>
          <option value="baixa">Baixa prioridade</option>
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="overflow-x-auto pb-3">
          <div className="grid min-w-[1500px] grid-cols-5 gap-4">
            {stages.map((stage) => {
              const stageCustomers = filteredCustomers.filter((customer) => customer.stage === stage.id);
              const stageValue = stageCustomers.reduce((total, customer) => total + customer.totalSpent, 0);

              return (
                <div
                  key={stage.id}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => handleDrop(event, stage.id)}
                  className={`flex min-h-[560px] flex-col rounded-lg border p-3 ${stage.className}`}
                >
                  <div className="mb-3 rounded-lg bg-white/80 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[18px] text-stone-500">{stage.icon}</span>
                          <h2 className="truncate text-sm font-bold text-black">{stage.label}</h2>
                        </div>
                        <p className="mt-1 text-xs font-bold text-stone-500">{stage.hint}</p>
                      </div>
                      <span className="rounded-full bg-black px-2 py-1 text-xs font-bold text-white">{stageCustomers.length}</span>
                    </div>
                    <p className="mt-3 text-xs font-bold text-stone-500">{formatMoney(stageValue)}</p>
                  </div>

                  <div className="flex flex-1 flex-col gap-3">
                    {isLoading ? (
                      <AdminEmptyState icon="hourglass_top" title="Carregando..." />
                    ) : stageCustomers.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-stone-200 bg-white/70 p-4 text-center text-xs font-bold text-stone-400">
                        Arraste clientes para esta etapa.
                      </div>
                    ) : (
                      stageCustomers.map((customer) => {
                        const whatsappUrl = getWhatsAppUrl(customer.phone, customer.name);
                        const stageIndex = stages.findIndex((item) => item.id === customer.stage);
                        const previousStage = stages[stageIndex - 1]?.id;
                        const nextStage = stages[stageIndex + 1]?.id;

                        return (
                          <article
                            key={customer.key}
                            draggable
                            onDragStart={(event) => {
                              setDraggedCustomerKey(customer.key);
                              event.dataTransfer.setData('text/plain', customer.key);
                            }}
                            onClick={() => setSelectedCustomerKey(customer.key)}
                            className={`rounded-lg border bg-white p-4 shadow-sm transition hover:border-stone-300 ${
                              selectedCustomerKey === customer.key ? 'border-black' : 'border-stone-100'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <h3 className="truncate text-sm font-bold text-black">{customer.name}</h3>
                                <p className="mt-1 truncate text-xs font-bold text-stone-400">{customer.phone || 'Telefone não informado'}</p>
                              </div>
                              <AdminStatusBadge tone={priorityTones[customer.priority]} className="min-h-6 shrink-0 px-2 py-0 text-[10px] uppercase">
                                {priorityLabels[customer.priority]}
                              </AdminStatusBadge>
                            </div>

                            <div className="mt-4 grid grid-cols-2 gap-2">
                              <div className="rounded bg-stone-50 p-2">
                                <p className="text-[10px] font-bold uppercase text-stone-400">Pedidos</p>
                                <p className="text-sm font-bold text-black">{customer.orders.length}</p>
                              </div>
                              <div className="rounded bg-stone-50 p-2">
                                <p className="text-[10px] font-bold uppercase text-stone-400">Total</p>
                                <p className="text-sm font-bold text-black">{formatMoney(customer.totalSpent)}</p>
                              </div>
                            </div>

                            <p className="mt-3 line-clamp-2 text-xs font-bold text-stone-500">{customer.favoriteProduct}</p>
                            <p className={`mt-3 text-xs font-bold ${isDueTodayOrOverdue(customer.nextActionAt) ? 'text-red-600' : 'text-stone-400'}`}>
                              {formatDateTime(customer.nextActionAt)}
                            </p>

                            <div className="mt-4 flex items-center justify-between gap-2">
                              <button
                                type="button"
                                disabled={!previousStage || updatingKey === customer.key}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  if (previousStage) moveCustomer(customer, previousStage);
                                }}
                                className="admin-button flex h-9 w-9 min-h-9 items-center justify-center border border-stone-200 text-stone-500 transition hover:bg-stone-50 disabled:opacity-30"
                                title="Mover para etapa anterior"
                              >
                                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                              </button>
                              <Link
                                href={getConversationHref(customer.key)}
                                onClick={(event) => event.stopPropagation()}
                                className="admin-button flex h-9 min-h-9 flex-1 items-center justify-center gap-2 bg-black px-3 text-xs text-white transition hover:bg-stone-800"
                              >
                                <span className="material-symbols-outlined text-[16px]">forum</span>
                                Conversa
                              </Link>
                              {whatsappUrl && (
                                <a
                                  href={whatsappUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(event) => event.stopPropagation()}
                                  className="admin-button flex h-9 min-h-9 w-9 items-center justify-center bg-[#25D366] text-white transition hover:bg-[#1FAF55]"
                                  title="Abrir WhatsApp"
                                >
                                  <span className="material-symbols-outlined text-[16px]">chat</span>
                                </a>
                              )}
                              <button
                                type="button"
                                disabled={!nextStage || updatingKey === customer.key}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  if (nextStage) moveCustomer(customer, nextStage);
                                }}
                                className="admin-button flex h-9 w-9 min-h-9 items-center justify-center border border-stone-200 text-stone-500 transition hover:bg-stone-50 disabled:opacity-30"
                                title="Mover para próxima etapa"
                              >
                                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                              </button>
                            </div>
                          </article>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <aside className="admin-surface p-5 2xl:sticky 2xl:top-24 2xl:self-start">
          {!selectedCustomer ? (
            <AdminEmptyState icon="view_kanban" title="Selecione um card" description="Edite etapa, prioridade, próxima ação e abra a conversa do cliente." />
          ) : (
            <div className="space-y-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-stone-400">Cliente</p>
                <h2 className="mt-1 text-xl font-bold text-black">{selectedCustomer.name}</h2>
                <p className="mt-1 text-sm font-bold text-stone-500">{selectedCustomer.phone || 'Telefone não informado'}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1">
                  <span className="text-xs font-bold uppercase text-stone-400">Etapa</span>
                  <select
                    value={selectedCustomer.stage}
                    onChange={(event) => upsertCustomerCard(selectedCustomer, { stage: event.target.value as CustomerCrmStage })}
                    className="h-11 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm font-bold outline-none focus:border-black"
                  >
                    {stages.map((stage) => (
                      <option key={stage.id} value={stage.id}>{stage.label}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-bold uppercase text-stone-400">Prioridade</span>
                  <select
                    value={selectedCustomer.priority}
                    onChange={(event) => upsertCustomerCard(selectedCustomer, { priority: event.target.value as CustomerCrmPriority })}
                    className="h-11 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm font-bold outline-none focus:border-black"
                  >
                    <option value="baixa">Baixa</option>
                    <option value="normal">Normal</option>
                    <option value="alta">Alta</option>
                  </select>
                </label>
              </div>

              <label className="space-y-1 block">
                <span className="text-xs font-bold uppercase text-stone-400">Próxima ação</span>
                <input
                  type="datetime-local"
                  value={selectedCustomer.nextActionAt ? selectedCustomer.nextActionAt.slice(0, 16) : ''}
                  onChange={(event) => upsertCustomerCard(selectedCustomer, { next_action_at: event.target.value ? new Date(event.target.value).toISOString() : null })}
                  className="h-11 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm font-bold outline-none focus:border-black"
                />
              </label>

              <label className="space-y-1 block">
                <span className="text-xs font-bold uppercase text-stone-400">Notas comerciais</span>
                <textarea
                  defaultValue={selectedCustomer.notes}
                  rows={5}
                  onBlur={(event) => upsertCustomerCard(selectedCustomer, { notes: event.target.value.trim() || null })}
                  placeholder="Preferências, objeções, combinados e oportunidade de recompra."
                  className="w-full resize-none rounded-lg border border-stone-200 bg-white p-3 text-sm font-bold outline-none placeholder:text-stone-400 focus:border-black"
                />
              </label>

              <button
                type="button"
                onClick={() => upsertCustomerCard(selectedCustomer, { last_contacted_at: new Date().toISOString() })}
                className="admin-button flex w-full items-center justify-center gap-2 border border-stone-200 py-3 text-sm text-stone-700 transition hover:bg-stone-50"
              >
                <span className="material-symbols-outlined text-[18px]">done_all</span>
                Marcar contato realizado
              </button>

              {getWhatsAppUrl(selectedCustomer.phone, selectedCustomer.name) && (
                <a
                  href={getWhatsAppUrl(selectedCustomer.phone, selectedCustomer.name)!}
                  target="_blank"
                  rel="noreferrer"
                  className="admin-button flex w-full items-center justify-center gap-2 bg-[#25D366] py-3 text-sm text-white transition hover:bg-[#1FAF55]"
                >
                  <span className="material-symbols-outlined text-[18px]">chat</span>
                  Abrir WhatsApp
                </a>
              )}

              <Link
                href={getConversationHref(selectedCustomer.key)}
                className="admin-button flex w-full items-center justify-center gap-2 bg-black py-3 text-sm text-white transition hover:bg-stone-800"
              >
                <span className="material-symbols-outlined text-[18px]">forum</span>
                Abrir conversa no admin
              </Link>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-stone-50 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Total gasto</p>
                  <p className="mt-1 text-sm font-bold text-black">{formatMoney(selectedCustomer.totalSpent)}</p>
                </div>
                <div className="rounded-lg bg-stone-50 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Ticket médio</p>
                  <p className="mt-1 text-sm font-bold text-black">{formatMoney(selectedCustomer.averageTicket)}</p>
                </div>
              </div>

              <div className="rounded-lg bg-stone-50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Produto favorito</p>
                <p className="mt-1 text-sm font-bold text-black">{selectedCustomer.favoriteProduct}</p>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-widest text-stone-400">Últimos pedidos</h3>
                {selectedCustomer.orders.slice(0, 4).map((order) => (
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
          )}
        </aside>
      </div>
    </div>
  );
}
