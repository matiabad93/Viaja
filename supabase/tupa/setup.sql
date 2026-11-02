-- Tupã Travel Premium: ejecutar SOLO en un proyecto Supabase nuevo, nunca en viaja-production.
-- Auth gestiona usuarios; PostgREST accede a public.trips por RLS.
begin;

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document jsonb not null check (jsonb_typeof(document)='object'),
  schema_version integer not null default 1 check (schema_version between 1 and 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tupa_trips_owner_updated on public.trips(user_id,updated_at desc);

create or replace function public.tupa_touch_updated_at()
returns trigger language plpgsql set search_path=''
as $$ begin new.updated_at:=pg_catalog.now(); return new; end; $$;
drop trigger if exists tupa_trips_updated_at on public.trips;
create trigger tupa_trips_updated_at before update on public.trips
for each row execute function public.tupa_touch_updated_at();

alter table public.trips enable row level security;
revoke all on public.trips from anon, authenticated;
grant usage on schema public to authenticated;
grant select,insert,update,delete on public.trips to authenticated;
grant all on public.trips to service_role;

drop policy if exists tupa_trips_owner_select on public.trips;
drop policy if exists tupa_trips_owner_insert on public.trips;
drop policy if exists tupa_trips_owner_update on public.trips;
drop policy if exists tupa_trips_owner_delete on public.trips;
create policy tupa_trips_owner_select on public.trips
 for select to authenticated using(user_id=(select auth.uid()));
create policy tupa_trips_owner_insert on public.trips
 for insert to authenticated with check(user_id=(select auth.uid()));
create policy tupa_trips_owner_update on public.trips
 for update to authenticated using(user_id=(select auth.uid()))
 with check(user_id=(select auth.uid()));
create policy tupa_trips_owner_delete on public.trips
 for delete to authenticated using(user_id=(select auth.uid()));

create table if not exists public.ai_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null unique,
  status text not null check(status in ('reserved','completed','failed')),
  model text,
  created_at timestamptz not null default now()
);
create index if not exists tupa_ai_usage_owner_created on public.ai_usage(user_id,created_at desc);
alter table public.ai_usage enable row level security;
revoke all on public.ai_usage from public,anon,authenticated;
grant all on public.ai_usage to service_role;
grant usage,select on sequence public.ai_usage_id_seq to service_role;

create or replace function public.tupa_reserve_ai_request(
 p_user_id uuid,p_request_id uuid
) returns jsonb language plpgsql security definer set search_path='' as $$
declare per_user integer; global_total integer; active_total integer;
begin
 if p_user_id is null or p_request_id is null
    or not exists(select 1 from auth.users where id=p_user_id) then
   return pg_catalog.jsonb_build_object('allowed',false,'reason','invalid');
 end if;
 -- Serializa la reserva para evitar saltarse cuotas con solicitudes concurrentes.
 perform pg_catalog.pg_advisory_xact_lock(68231,1101);
 select count(*) into per_user from public.ai_usage
  where user_id=p_user_id and created_at>pg_catalog.now()-interval '24 hours';
 if per_user>=10 then
  return pg_catalog.jsonb_build_object('allowed',false,'reason','user_daily_limit');
 end if;
 select count(*) into global_total from public.ai_usage
  where created_at>pg_catalog.now()-interval '24 hours';
 if global_total>=40 then
  return pg_catalog.jsonb_build_object('allowed',false,'reason','global_daily_limit');
 end if;
 select count(*) into active_total from public.ai_usage
  where user_id=p_user_id and status='reserved'
    and created_at>pg_catalog.now()-interval '10 minutes';
 if active_total>0 then
  return pg_catalog.jsonb_build_object('allowed',false,'reason','request_in_progress');
 end if;
 insert into public.ai_usage(user_id,request_id,status) values(p_user_id,p_request_id,'reserved');
 return pg_catalog.jsonb_build_object('allowed',true,'remaining_user_today',9-per_user);
end;
$$;

create or replace function public.tupa_finalize_ai_request(
 p_request_id uuid,p_status text,p_model text default null
) returns boolean language plpgsql security definer set search_path='' as $$
declare changed integer;
begin
 if p_request_id is null or p_status not in ('completed','failed') then return false; end if;
 update public.ai_usage set status=p_status,model=pg_catalog.left(p_model,100)
  where request_id=p_request_id and status='reserved';
 get diagnostics changed=row_count;
 return changed=1;
end;
$$;
revoke all on function public.tupa_reserve_ai_request(uuid,uuid) from public,anon,authenticated;
revoke all on function public.tupa_finalize_ai_request(uuid,text,text) from public,anon,authenticated;
grant execute on function public.tupa_reserve_ai_request(uuid,uuid) to service_role;
grant execute on function public.tupa_finalize_ai_request(uuid,text,text) to service_role;
commit;
