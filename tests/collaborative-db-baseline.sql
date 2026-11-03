-- Minimal local Supabase Auth/trips fixture for CI Postgres 17, no real customer data.
create role authenticated;
create role anon;
create role service_role;
create schema auth;
grant usage on schema auth to authenticated;
create table auth.users (id uuid primary key,email text not null);
create or replace function auth.uid() returns uuid language sql stable set search_path='' as $$
select nullif(pg_catalog.current_setting('request.jwt.claim.sub',true),'')::uuid
$$;
grant execute on function auth.uid() to authenticated;
create table public.trips (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id),
 document jsonb not null,
 schema_version integer not null default 1,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.trips enable row level security;
grant select,insert,update,delete on public.trips to authenticated;
create policy trips_select_self on public.trips for select to authenticated using(user_id=(select auth.uid()));
create policy trips_insert_self on public.trips for insert to authenticated with check(user_id=(select auth.uid()));
create policy trips_update_self on public.trips for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy trips_delete_self on public.trips for delete to authenticated using(user_id=(select auth.uid()));
insert into auth.users (id,email) values
 ('11111111-1111-4111-8111-111111111111','alice@example.com'),
 ('22222222-2222-4222-8222-222222222222','bob@example.com'),
 ('33333333-3333-4333-8333-333333333333','carol@example.com'),
 ('44444444-4444-4444-8444-444444444444','dana@example.com');
insert into public.trips(id,user_id,document)
values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111',
'{"id":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","trip":{"destination":"Roma"},"kind":"draft","createdAt":"2026-11-03T00:00:00.000Z"}');
