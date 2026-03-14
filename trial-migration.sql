-- Kjør dette i Supabase SQL editor

alter table businesses
  add column if not exists trial_ends_at      timestamptz default (now() + interval '7 days'),
  add column if not exists is_active          boolean     default true,
  add column if not exists trial_reminder_sent boolean    default false,
  add column if not exists stripe_customer_id text        default null;

-- Index for cron-jobben
create index if not exists idx_businesses_trial on businesses (trial_ends_at, is_active);
