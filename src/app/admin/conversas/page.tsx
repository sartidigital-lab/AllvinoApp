"use client";

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
  CustomerConversation,
  CustomerConversationMessage,
  CustomerConversationMessageDirection,
  CustomerConversationStatus,
} from '@/types/database';

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

type ConversationCustomer = {
  key: string;
  userId: string | null;
  name: string;
  phone: string | null;
  orders: CustomerOrder[];
  totalSpent: number;
  lastOrderAt: string;
  favoriteProduct: string;
  conversation: CustomerConversation | null;
  lastMessage: CustomerConversationMessage | null;
};

const conversationSelect = 'id,customer_key,user_id,customer_name,customer_phone,status,channel,last_message_at,created_at,updated_at';
const messageSelect = 'id,conversation_id,direction,body,sent_at,created_by,created_at';

const statusLabels: Record<CustomerConversationStatus, string> = {
  open: 'Aberta',
  waiting: 'Aguardando cliente',
  closed: 'Encerrada',
};

const statusStyles: Record<CustomerConversationStatus, string> = {
  open: 'bg-emerald-100 text-emerald-700',
  waiting: 'bg-amber-100 text-amber-700',
  closed: 'bg-stone-200 text-stone-700',
};

const directionLabels: Record<CustomerConversationMessageDirection, string> = {
  incoming: 'Cliente',
  outgoing: 'Allvino',
  note: 'Nota',
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

function normalizePhone(value: string | null | undefined) {
  return (value || '').replace(/\D/g, '');
}

function getWhatsAppUrl(phone: string | null, name: string, message: string) {
  const digits = normalizePhone(phone);
  if (!digits) return null;

  const normalizedPhone = digits.startsWith('55') ? digits : `55${digits}`;
  const body = message.trim() || `Ola, ${name}! Aqui e da Allvino.`;
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(body)}`;
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

  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'Sem historico';
}

function formatShortDate(value: string | null) {
  if (!value) return 'Sem mensagens';
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminConversasPage() {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [conversations, setConversations] = useState<CustomerConversation[]>([]);
  const [messages, setMessages] = useState<CustomerConversationMessage[]>([]);
  const [selectedCustomerKey, setSelectedCustomerKey] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | CustomerConversationStatus>('all');
  const [draft, setDraft] = useState('');
  const [direction, setDirection] = useState<CustomerConversationMessageDirection>('outgoing');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadConversations = async () => {
    setIsLoading(true);
    setMessage(null);

    const supabase = createClient();
    const [ordersResult, conversationsResult] = await Promise.all([
      supabase
        .from('orders')
        .select('id,user_id,total_amount,status,created_at,customer_name,customer_phone,delivery_type,order_items(quantity,product_name)')
        .order('created_at', { ascending: false })
        .limit(500),
      supabase
        .from('customer_conversations')
        .select(conversationSelect)
        .order('last_message_at', { ascending: false, nullsFirst: false }),
    ]);

    if (ordersResult.error || conversationsResult.error) {
      setMessage('Nao foi possivel carregar conversas.');
      setIsLoading(false);
      return;
    }

    const nextOrders = (ordersResult.data || []) as CustomerOrder[];
    const nextConversations = (conversationsResult.data || []) as CustomerConversation[];
    setOrders(nextOrders);
    setConversations(nextConversations);
    setSelectedCustomerKey((current) => current || nextConversations[0]?.customer_key || (nextOrders[0] ? getCustomerKey(nextOrders[0]) : null));
    setIsLoading(false);
  };

  useEffect(() => {
    loadConversations();
  }, []);

  const customers = useMemo(() => {
    const groups = new Map<string, CustomerOrder[]>();
    const conversationByKey = new Map(conversations.map((conversation) => [conversation.customer_key, conversation]));
    const lastMessageByConversation = new Map<string, CustomerConversationMessage>();

    messages.forEach((item) => {
      const current = lastMessageByConversation.get(item.conversation_id);
      if (!current || new Date(item.sent_at).getTime() > new Date(current.sent_at).getTime()) {
        lastMessageByConversation.set(item.conversation_id, item);
      }
    });

    orders.forEach((order) => {
      const key = getCustomerKey(order);
      groups.set(key, [...(groups.get(key) || []), order]);
    });

    conversations.forEach((conversation) => {
      if (!groups.has(conversation.customer_key)) {
        groups.set(conversation.customer_key, []);
      }
    });

    return [...groups.entries()]
      .map(([key, customerOrders]): ConversationCustomer => {
        const sortedOrders = [...customerOrders].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        const conversation = conversationByKey.get(key) || null;
        const firstOrder = sortedOrders[0];
        const totalSpent = sortedOrders.reduce((total, order) => total + order.total_amount, 0);

        return {
          key,
          userId: conversation?.user_id || firstOrder?.user_id || null,
          name: conversation?.customer_name || firstOrder?.customer_name || 'Cliente sem nome',
          phone: conversation?.customer_phone || firstOrder?.customer_phone || null,
          orders: sortedOrders,
          totalSpent,
          lastOrderAt: firstOrder?.created_at || conversation?.updated_at || new Date(0).toISOString(),
          favoriteProduct: getFavoriteProduct(sortedOrders),
          conversation,
          lastMessage: conversation ? lastMessageByConversation.get(conversation.id) || null : null,
        };
      })
      .sort((a, b) => {
        const firstDate = a.conversation?.last_message_at || a.lastOrderAt;
        const secondDate = b.conversation?.last_message_at || b.lastOrderAt;
        return new Date(secondDate).getTime() - new Date(firstDate).getTime();
      });
  }, [conversations, messages, orders]);

  const filteredCustomers = useMemo(() => {
    const normalizedSearch = normalizeSearch(searchTerm.trim());

    return customers.filter((customer) => {
      const status = customer.conversation?.status || 'open';
      const matchesStatus = statusFilter === 'all' || status === statusFilter;
      const searchable = normalizeSearch([customer.name, customer.phone, customer.favoriteProduct, customer.lastMessage?.body].join(' '));
      const matchesSearch = !normalizedSearch || searchable.includes(normalizedSearch);
      return matchesStatus && matchesSearch;
    });
  }, [customers, searchTerm, statusFilter]);

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.key === selectedCustomerKey) || filteredCustomers[0] || null,
    [customers, filteredCustomers, selectedCustomerKey]
  );

  const selectedMessages = useMemo(() => {
    if (!selectedCustomer?.conversation) return [];
    return messages
      .filter((item) => item.conversation_id === selectedCustomer.conversation?.id)
      .sort((a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime());
  }, [messages, selectedCustomer]);

  const loadMessages = async (conversationId: string) => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('customer_conversation_messages')
      .select(messageSelect)
      .eq('conversation_id', conversationId)
      .order('sent_at', { ascending: true });

    if (error) {
      setMessage('Nao foi possivel carregar o historico da conversa.');
      return;
    }

    setMessages((current) => {
      const otherMessages = current.filter((item) => item.conversation_id !== conversationId);
      return [...otherMessages, ...((data || []) as CustomerConversationMessage[])];
    });
  };

  const ensureConversation = async (customer: ConversationCustomer) => {
    if (customer.conversation) return customer.conversation;

    const supabase = createClient();
    const { data, error } = await supabase
      .from('customer_conversations')
      .upsert({
        customer_key: customer.key,
        user_id: customer.userId,
        customer_name: customer.name,
        customer_phone: customer.phone,
        status: 'open',
        channel: 'whatsapp',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'customer_key' })
      .select(conversationSelect)
      .single();

    if (error) {
      setMessage('Nao foi possivel abrir a conversa.');
      return null;
    }

    const conversation = data as CustomerConversation;
    setConversations((current) => {
      const withoutConversation = current.filter((item) => item.customer_key !== conversation.customer_key);
      return [conversation, ...withoutConversation];
    });
    return conversation;
  };

  const selectCustomer = async (customer: ConversationCustomer) => {
    setSelectedCustomerKey(customer.key);
    const conversation = await ensureConversation(customer);
    if (conversation) {
      await loadMessages(conversation.id);
    }
  };

  const saveMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedCustomer || !draft.trim()) return;

    setIsSending(true);
    setMessage(null);

    const conversation = await ensureConversation(selectedCustomer);
    if (!conversation) {
      setIsSending(false);
      return;
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const sentAt = new Date().toISOString();

    const { data, error } = await supabase
      .from('customer_conversation_messages')
      .insert({
        conversation_id: conversation.id,
        direction,
        body: draft.trim(),
        sent_at: sentAt,
        created_by: user?.id || null,
      })
      .select(messageSelect)
      .single();

    if (error) {
      setMessage('Nao foi possivel salvar a mensagem.');
      setIsSending(false);
      return;
    }

    const nextStatus: CustomerConversationStatus = direction === 'outgoing' ? 'waiting' : 'open';
    const { data: updatedConversation } = await supabase
      .from('customer_conversations')
      .update({
        status: direction === 'note' ? conversation.status : nextStatus,
        last_message_at: sentAt,
        updated_at: sentAt,
      })
      .eq('id', conversation.id)
      .select(conversationSelect)
      .single();

    if (updatedConversation) {
      const savedConversation = updatedConversation as CustomerConversation;
      setConversations((current) => [savedConversation, ...current.filter((item) => item.id !== savedConversation.id)]);
    }

    setMessages((current) => [...current, data as CustomerConversationMessage]);
    setDraft('');
    setIsSending(false);
  };

  const updateStatus = async (conversation: CustomerConversation, status: CustomerConversationStatus) => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('customer_conversations')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', conversation.id)
      .select(conversationSelect)
      .single();

    if (error) {
      setMessage('Nao foi possivel atualizar o status da conversa.');
      return;
    }

    const savedConversation = data as CustomerConversation;
    setConversations((current) => [savedConversation, ...current.filter((item) => item.id !== savedConversation.id)]);
  };

  const whatsappUrl = selectedCustomer
    ? getWhatsAppUrl(selectedCustomer.phone, selectedCustomer.name, draft)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <h1 className="text-3xl font-bold font-serif text-black">Conversas</h1>
          <p className="mt-1 text-sm font-bold text-stone-500">Historico comercial, mensagens manuais e continuidade pelo WhatsApp.</p>
        </div>
        <button
          type="button"
          onClick={loadConversations}
          className="flex items-center gap-2 rounded-lg bg-black px-5 py-2.5 text-sm font-bold text-white transition hover:bg-stone-800"
        >
          <span className="material-symbols-outlined text-[18px]">refresh</span>
          Atualizar
        </button>
      </div>

      {message && (
        <div className="rounded-lg border border-stone-200 bg-white px-4 py-3 text-sm font-bold text-stone-700">
          {message}
        </div>
      )}

      <div className="grid min-h-[calc(100vh-190px)] grid-cols-1 gap-4 xl:grid-cols-[360px_minmax(0,1fr)_320px]">
        <aside className="overflow-hidden rounded-lg border border-stone-100 bg-white shadow-sm">
          <div className="space-y-3 border-b border-stone-100 p-4">
            <label className="relative block">
              <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-stone-400">search</span>
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar conversa"
                className="h-11 w-full rounded-lg border border-stone-200 bg-white pl-10 pr-3 text-sm font-bold outline-none focus:border-black"
              />
            </label>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'all' | CustomerConversationStatus)}
              className="h-11 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm font-bold text-stone-700 outline-none focus:border-black"
            >
              <option value="all">Todas as conversas</option>
              <option value="open">Abertas</option>
              <option value="waiting">Aguardando cliente</option>
              <option value="closed">Encerradas</option>
            </select>
          </div>

          <div className="max-h-[calc(100vh-330px)] overflow-y-auto">
            {isLoading ? (
              <div className="p-6 text-center text-sm font-bold text-stone-400">Carregando conversas...</div>
            ) : filteredCustomers.length === 0 ? (
              <div className="p-6 text-center text-sm font-bold text-stone-400">Nenhuma conversa encontrada.</div>
            ) : (
              filteredCustomers.map((customer) => {
                const status = customer.conversation?.status || 'open';
                const isSelected = selectedCustomer?.key === customer.key;

                return (
                  <button
                    key={customer.key}
                    type="button"
                    onClick={() => selectCustomer(customer)}
                    className={`w-full border-b border-stone-100 p-4 text-left transition hover:bg-stone-50 ${
                      isSelected ? 'bg-stone-50' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-black">{customer.name}</p>
                        <p className="mt-1 truncate text-xs font-bold text-stone-400">{customer.phone || 'Telefone nao informado'}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold uppercase ${statusStyles[status]}`}>
                        {statusLabels[status]}
                      </span>
                    </div>
                    <p className="mt-3 line-clamp-2 text-xs font-bold text-stone-500">
                      {customer.lastMessage?.body || customer.favoriteProduct}
                    </p>
                    <p className="mt-2 text-[11px] font-bold text-stone-400">
                      {formatShortDate(customer.conversation?.last_message_at || customer.lastOrderAt)}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section className="flex min-h-[620px] flex-col overflow-hidden rounded-lg border border-stone-100 bg-white shadow-sm">
          {!selectedCustomer ? (
            <div className="flex flex-1 items-center justify-center p-8 text-sm font-bold text-stone-400">
              Selecione uma conversa.
            </div>
          ) : (
            <>
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 p-4">
                <div>
                  <h2 className="text-lg font-bold text-black">{selectedCustomer.name}</h2>
                  <p className="text-sm font-bold text-stone-500">{selectedCustomer.phone || 'Telefone nao informado'}</p>
                </div>
                {selectedCustomer.conversation && (
                  <select
                    value={selectedCustomer.conversation.status}
                    onChange={(event) => updateStatus(selectedCustomer.conversation!, event.target.value as CustomerConversationStatus)}
                    className="h-10 rounded-lg border border-stone-200 bg-white px-3 text-sm font-bold outline-none focus:border-black"
                  >
                    <option value="open">Aberta</option>
                    <option value="waiting">Aguardando cliente</option>
                    <option value="closed">Encerrada</option>
                  </select>
                )}
              </header>

              <div className="flex-1 space-y-4 overflow-y-auto bg-[#FDFBF7] p-4">
                {!selectedCustomer.conversation || selectedMessages.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-stone-200 bg-white p-6 text-center text-sm font-bold text-stone-400">
                    Sem mensagens registradas para este cliente.
                  </div>
                ) : (
                  selectedMessages.map((item) => {
                    const isOutgoing = item.direction === 'outgoing';
                    const isNote = item.direction === 'note';

                    return (
                      <div
                        key={item.id}
                        className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[78%] rounded-lg px-4 py-3 shadow-sm ${
                            isNote
                              ? 'border border-amber-100 bg-amber-50 text-amber-900'
                              : isOutgoing
                                ? 'bg-black text-white'
                                : 'border border-stone-100 bg-white text-stone-800'
                          }`}
                        >
                          <div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase opacity-70">
                            <span>{directionLabels[item.direction]}</span>
                            <span>{formatShortDate(item.sent_at)}</span>
                          </div>
                          <p className="whitespace-pre-wrap text-sm font-bold leading-relaxed">{item.body}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <form onSubmit={saveMessage} className="space-y-3 border-t border-stone-100 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  {(['outgoing', 'incoming', 'note'] as CustomerConversationMessageDirection[]).map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setDirection(item)}
                      className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
                        direction === item ? 'bg-black text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                      }`}
                    >
                      {directionLabels[item]}
                    </button>
                  ))}
                </div>
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  rows={3}
                  placeholder="Digite a mensagem ou nota da conversa"
                  className="w-full resize-none rounded-lg border border-stone-200 p-3 text-sm font-bold outline-none placeholder:text-stone-400 focus:border-black"
                />
                <div className="flex flex-col gap-2 sm:flex-row">
                  {whatsappUrl && direction === 'outgoing' && (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex h-11 items-center justify-center gap-2 rounded-lg bg-[#25D366] px-4 text-sm font-bold text-white transition hover:bg-[#1FAF55]"
                    >
                      <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                      Abrir WhatsApp
                    </a>
                  )}
                  <button
                    type="submit"
                    disabled={isSending || !draft.trim()}
                    className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-black px-4 text-sm font-bold text-white transition hover:bg-stone-800 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[18px]">save</span>
                    {isSending ? 'Salvando...' : 'Salvar no historico'}
                  </button>
                </div>
              </form>
            </>
          )}
        </section>

        <aside className="rounded-lg border border-stone-100 bg-white p-5 shadow-sm">
          {!selectedCustomer ? (
            <div className="py-10 text-center text-sm font-bold text-stone-400">Sem cliente selecionado.</div>
          ) : (
            <div className="space-y-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-stone-400">Resumo</p>
                <h3 className="mt-1 text-xl font-bold text-black">{selectedCustomer.name}</h3>
                <p className="mt-1 text-sm font-bold text-stone-500">{selectedCustomer.phone || 'Telefone nao informado'}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-stone-50 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Pedidos</p>
                  <p className="mt-1 text-lg font-bold text-black">{selectedCustomer.orders.length}</p>
                </div>
                <div className="rounded-lg bg-stone-50 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Total gasto</p>
                  <p className="mt-1 text-sm font-bold text-black">{formatMoney(selectedCustomer.totalSpent)}</p>
                </div>
              </div>
              <div className="rounded-lg bg-stone-50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Produto favorito</p>
                <p className="mt-1 text-sm font-bold text-black">{selectedCustomer.favoriteProduct}</p>
              </div>
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-widest text-stone-400">Ultimos pedidos</h4>
                {selectedCustomer.orders.slice(0, 4).map((order) => (
                  <div key={order.id} className="rounded-lg border border-stone-100 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-black">#{order.id.slice(0, 8)}</p>
                        <p className="text-xs font-bold text-stone-400">{formatShortDate(order.created_at)}</p>
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
