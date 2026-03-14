-- LokalProfil – kjør ALT dette i Supabase SQL Editor
-- Trygt å kjøre flere ganger (IF NOT EXISTS / OR REPLACE)

create extension if not exists "uuid-ossp";

-- ── Tabeller ──────────────────────────────────────────────────────────────────

create table if not exists businesses (
  id                   uuid primary key references auth.users(id) on delete cascade,
  name                 text not null,
  email                text,
  phone                text,
  google_review_link   text,
  -- Trial / betaling
  trial_ends_at        timestamptz default (now() + interval '7 days'),
  is_active            boolean default true,
  trial_reminder_sent  boolean default false,
  stripe_customer_id   text default null,
  created_at           timestamptz default now()
);

create table if not exists customers (
  id               uuid primary key default uuid_generate_v4(),
  business_id      uuid references businesses(id) on delete cascade not null,
  name             text not null,
  phone            text not null,
  appointment_time timestamptz not null,
  reminded_24h     boolean default false,
  reminded_2h      boolean default false,
  review_requested boolean default false,
  created_at       timestamptz default now()
);

create table if not exists feedback (
  id          uuid primary key default uuid_generate_v4(),
  customer_id uuid references customers(id) on delete cascade,
  business_id uuid references businesses(id) on delete cascade,
  rating      int check (rating >= 1 and rating <= 5),
  message     text,
  created_at  timestamptz default now()
);

create table if not exists messages (
  id          uuid primary key default uuid_generate_v4(),
  business_id uuid references businesses(id) on delete cascade,
  customer_id uuid references customers(id) on delete cascade,
  direction   text check (direction in ('in', 'out')) not null,
  body        text not null,
  created_at  timestamptz default now()
);

-- ── RLS ───────────────────────────────────────────────────────────────────────

alter table businesses enable row level security;
alter table customers   enable row level security;
alter table feedback    enable row level security;
alter table messages    enable row level security;

-- Drop og re-opprett policies (trygt å kjøre på nytt)
drop policy if exists "businesses_own"  on businesses;
drop policy if exists "customers_own"   on customers;
drop policy if exists "feedback_own"    on feedback;
drop policy if exists "messages_own"    on messages;

create policy "businesses_own" on businesses for all using (id = auth.uid());
create policy "customers_own"  on customers  for all using (business_id = auth.uid());
create policy "feedback_own"   on feedback   for all using (business_id = auth.uid());
create policy "messages_own"   on messages   for all using (business_id = auth.uid());

-- ── Realtime ──────────────────────────────────────────────────────────────────

alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table feedback;

-- ── Indekser ──────────────────────────────────────────────────────────────────

create index if not exists idx_customers_business    on customers(business_id);
create index if not exists idx_customers_appt        on customers(appointment_time);
create index if not exists idx_customers_phone       on customers(phone);
create index if not exists idx_feedback_business     on feedback(business_id);
create index if not exists idx_messages_customer     on messages(customer_id);
create index if not exists idx_messages_business     on messages(business_id);
create index if not exists idx_businesses_trial      on businesses(trial_ends_at, is_active);

-- ── Auto-opprett businesses-rad ved registrering ─────────────────────────────
-- Dette fikser "Could not find table"-feilen: brukere får en rad automatisk

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.businesses (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
