-- ============================================================================
-- Cash Flow Quest — Supabase schema
-- Run this in the Supabase SQL editor (Project > SQL Editor > New query).
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE where possible.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Extensions
-- ----------------------------------------------------------------------------
create extension if not exists "uuid-ossp";

-- ----------------------------------------------------------------------------
-- users
-- Mirrors auth.users with app-specific fields (plan, billing refs).
-- A row is created automatically for every new auth user via trigger below.
-- ----------------------------------------------------------------------------
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  plan_status text not null default 'inactive'
    check (plan_status in ('inactive', 'active', 'past_due', 'canceled')),
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  lemonsqueezy_customer_id text unique,
  lemonsqueezy_subscription_id text unique,
  current_streak int not null default 0,
  longest_streak int not null default 0,
  last_log_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists users_stripe_customer_id_idx
  on public.users (stripe_customer_id);
create index if not exists users_lemonsqueezy_customer_id_idx
  on public.users (lemonsqueezy_customer_id);

-- ----------------------------------------------------------------------------
-- transactions
-- Manual income/expense entries a user logs.
-- ----------------------------------------------------------------------------
create table if not exists public.transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users (id) on delete cascade,
  type text not null check (type in ('income', 'expense')),
  category text not null default 'other',
  label text not null,
  amount_cents bigint not null check (amount_cents > 0),
  occurred_on date not null default current_date,
  is_recurring boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists transactions_user_id_occurred_on_idx
  on public.transactions (user_id, occurred_on desc);

-- ----------------------------------------------------------------------------
-- streaks
-- One row per user per calendar day they logged at least one transaction.
-- This is the source of truth the streak/health score is computed from —
-- users.current_streak / longest_streak are a denormalized cache kept in
-- sync by the trigger below.
-- ----------------------------------------------------------------------------
create table if not exists public.streaks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users (id) on delete cascade,
  log_date date not null,
  transactions_logged int not null default 1,
  net_cents bigint not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, log_date)
);

create index if not exists streaks_user_id_log_date_idx
  on public.streaks (user_id, log_date desc);

-- ----------------------------------------------------------------------------
-- updated_at trigger for users
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
  before update on public.users
  for each row execute procedure public.set_updated_at();

-- ----------------------------------------------------------------------------
-- auto-create a public.users row when someone signs up via Supabase Auth
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_auth_user()
returns trigger as $$
begin
  insert into public.users (id, email, display_name)
  values (new.id, new.email, split_part(new.email, '@', 1))
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_auth_user();

-- ----------------------------------------------------------------------------
-- streak + cache maintenance whenever a transaction is logged
-- Upserts today's streaks row, then recomputes current_streak / longest_streak
-- by walking back day-by-day from today through consecutive logged days.
-- ----------------------------------------------------------------------------
create or replace function public.handle_transaction_insert()
returns trigger as $$
declare
  signed_amount bigint;
  streak_count int := 0;
  cursor_date date := current_date;
begin
  signed_amount := case when new.type = 'income' then new.amount_cents else -new.amount_cents end;

  insert into public.streaks (user_id, log_date, transactions_logged, net_cents)
  values (new.user_id, new.occurred_on, 1, signed_amount)
  on conflict (user_id, log_date) do update
    set transactions_logged = public.streaks.transactions_logged + 1,
        net_cents = public.streaks.net_cents + excluded.net_cents;

  -- Recompute current streak by walking back from today.
  while exists (
    select 1 from public.streaks
    where user_id = new.user_id and log_date = cursor_date
  ) loop
    streak_count := streak_count + 1;
    cursor_date := cursor_date - 1;
  end loop;

  update public.users
  set current_streak = streak_count,
      longest_streak = greatest(longest_streak, streak_count),
      last_log_date = current_date
  where id = new.user_id;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_transaction_insert on public.transactions;
create trigger on_transaction_insert
  after insert on public.transactions
  for each row execute procedure public.handle_transaction_insert();

-- ----------------------------------------------------------------------------
-- Row Level Security — every table is locked to its owning user.
-- ----------------------------------------------------------------------------
alter table public.users enable row level security;
alter table public.transactions enable row level security;
alter table public.streaks enable row level security;

drop policy if exists "users can view own row" on public.users;
create policy "users can view own row"
  on public.users for select
  using (auth.uid() = id);

drop policy if exists "users can update own row" on public.users;
create policy "users can update own row"
  on public.users for update
  using (auth.uid() = id);

drop policy if exists "users can view own transactions" on public.transactions;
create policy "users can view own transactions"
  on public.transactions for select
  using (auth.uid() = user_id);

drop policy if exists "users can insert own transactions" on public.transactions;
create policy "users can insert own transactions"
  on public.transactions for insert
  with check (auth.uid() = user_id);

drop policy if exists "users can delete own transactions" on public.transactions;
create policy "users can delete own transactions"
  on public.transactions for delete
  using (auth.uid() = user_id);

drop policy if exists "users can view own streaks" on public.streaks;
create policy "users can view own streaks"
  on public.streaks for select
  using (auth.uid() = user_id);

-- Note: inserts/updates to streaks happen only via the SECURITY DEFINER
-- trigger above, so no client-facing insert/update policy is needed on
-- public.streaks. Webhook routes use the service-role key, which bypasses
-- RLS entirely — never expose the service-role key to the browser.
