-- Viaja v1: foundation for Supabase Auth and persisted travel data.
-- Run once in Supabase SQL Editor for the intended project AFTER reviewing.
-- This migration does not enable the OpenAI endpoint or migrate browser data.
begin;

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 120),
  avatar_url text check (avatar_url is null or char_length(avatar_url) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  document jsonb not null check (jsonb_typeof(document) = 'object'),
  schema_version integer not null default 1 check (schema_version between 1 and 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index trips_user_updated_idx on public.trips (user_id, updated_at desc);

create table public.favorites (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  guide_id text not null check (char_length(guide_id) between 1 and 100),
  created_at timestamptz not null default now(),
  primary key (user_id, guide_id)
);

-- Public editorial content; modifications must happen via a trusted server/admin flow.
create table public.guides (
  id text primary key check (char_length(id) between 1 and 100),
  content jsonb not null check (jsonb_typeof(content) = 'object'),
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index guides_published_idx on public.guides (published);

-- The backend owns writes and quotas; browser roles must never change usage records.
create table public.ai_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null unique,
  status text not null check (status in ('reserved','completed','failed')),
  model text,
  estimated_cost_usd numeric(12,6) not null default 0 check (estimated_cost_usd >= 0),
  created_at timestamptz not null default now()
);
create index ai_usage_user_created_idx on public.ai_usage (user_id, created_at desc);

create function public.viaja_touch_updated_at()
returns trigger language plpgsql set search_path = ''
as $$ begin new.updated_at := now(); return new; end; $$;

create trigger profiles_updated_at before update on public.profiles
for each row execute function public.viaja_touch_updated_at();
create trigger trips_updated_at before update on public.trips
for each row execute function public.viaja_touch_updated_at();
create trigger guides_updated_at before update on public.guides
for each row execute function public.viaja_touch_updated_at();

-- Both SQL grants and RLS are necessary. Clear any default access.
alter table public.profiles enable row level security;
alter table public.trips enable row level security;
alter table public.favorites enable row level security;
alter table public.guides enable row level security;
alter table public.ai_usage enable row level security;

revoke all on public.profiles, public.trips, public.favorites, public.guides, public.ai_usage from anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.trips to authenticated;
grant select, insert, delete on public.favorites to authenticated;
grant select on public.guides to anon, authenticated;
grant all on public.profiles, public.trips, public.favorites, public.guides, public.ai_usage to service_role;
grant usage, select on sequence public.ai_usage_id_seq to service_role;

-- Profiles: a member can view or edit only their own profile. No role field to escalate.
create policy profiles_select_self on public.profiles
for select to authenticated using (user_id = (select auth.uid()));
create policy profiles_insert_self on public.profiles
for insert to authenticated with check (user_id = (select auth.uid()));
create policy profiles_update_self on public.profiles
for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

-- Trips: reject attempts to read, create, reassign, update or delete another member's data.
create policy trips_select_self on public.trips
for select to authenticated using (user_id = (select auth.uid()));
create policy trips_insert_self on public.trips
for insert to authenticated with check (user_id = (select auth.uid()));
create policy trips_update_self on public.trips
for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));
create policy trips_delete_self on public.trips
for delete to authenticated using (user_id = (select auth.uid()));

create policy favorites_select_self on public.favorites
for select to authenticated using (user_id = (select auth.uid()));
create policy favorites_insert_self on public.favorites
for insert to authenticated with check (user_id = (select auth.uid()));
create policy favorites_delete_self on public.favorites
for delete to authenticated using (user_id = (select auth.uid()));

-- Only published editorial content is readable publicly. No browser-role write grants.
create policy guides_select_published on public.guides
for select to anon, authenticated using (published = true);

-- ai_usage: no anon/authenticated grants or policies. Server-only.
commit;
