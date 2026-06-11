create table if not exists public.customer_conversations (
  id uuid primary key default gen_random_uuid(),
  customer_key text not null unique,
  user_id uuid references auth.users(id) on delete set null,
  customer_name text not null,
  customer_phone text,
  status text not null default 'open'
    check (status in ('open', 'waiting', 'closed')),
  channel text not null default 'whatsapp'
    check (channel in ('whatsapp', 'manual')),
  last_message_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.customer_conversation_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.customer_conversations(id) on delete cascade,
  direction text not null check (direction in ('incoming', 'outgoing', 'note')),
  body text not null,
  sent_at timestamptz not null default timezone('utc'::text, now()),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists customer_conversations_status_last_message_idx
  on public.customer_conversations (status, coalesce(last_message_at, updated_at) desc);

create index if not exists customer_conversations_phone_idx
  on public.customer_conversations (customer_phone)
  where customer_phone is not null;

create index if not exists customer_conversation_messages_conversation_sent_idx
  on public.customer_conversation_messages (conversation_id, sent_at asc);

grant select, insert, update, delete on public.customer_conversations to authenticated;
grant select, insert, update, delete on public.customer_conversation_messages to authenticated;

alter table public.customer_conversations enable row level security;
alter table public.customer_conversation_messages enable row level security;

drop policy if exists "Admins can manage customer conversations" on public.customer_conversations;
create policy "Admins can manage customer conversations"
  on public.customer_conversations
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can manage customer conversation messages" on public.customer_conversation_messages;
create policy "Admins can manage customer conversation messages"
  on public.customer_conversation_messages
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
