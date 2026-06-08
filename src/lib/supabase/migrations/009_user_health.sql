-- 009_user_health.sql
-- user_health: per-user health blob (supplements, fitness schedule, supplement log).
-- Stored as a single JSONB document keyed by user_id, mirroring user_dashboard_layouts.
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor).

create table if not exists public.user_health (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Row-level security: each user can only read/write their own row.
-- (The API uses the anon key + the user's session, so RLS is enforced.)
alter table public.user_health enable row level security;

drop policy if exists "Users manage own health" on public.user_health;
create policy "Users manage own health"
  on public.user_health
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
