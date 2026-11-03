-- Viaja · collaborative trips MVP (additive migration; do not apply until CI/security review)
begin;
create schema if not exists private;
grant usage on schema private to authenticated;
alter table public.trips add column if not exists version integer not null default 1;
create index if not exists viaja_trips_version_idx on public.trips(id,version);
create or replace function private.viaja_bump_trip_version()
returns trigger language plpgsql set search_path='' as $$
begin new.version:=old.version+1; return new; end; $$;
drop trigger if exists viaja_trip_version_trigger on public.trips;
create trigger viaja_trip_version_trigger before update on public.trips
for each row execute function private.viaja_bump_trip_version();

create table if not exists public.trip_members(
 trip_id uuid not null references public.trips(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null check(role in ('editor','viewer')),
 joined_at timestamptz not null default now(),
 invited_by uuid references auth.users(id) on delete set null,
 primary key(trip_id,user_id)
);
create index if not exists viaja_members_user_idx on public.trip_members(user_id,trip_id);
create table if not exists public.trip_invitations(
 id uuid primary key default gen_random_uuid(),
 trip_id uuid not null references public.trips(id) on delete cascade,
 created_by uuid not null references auth.users(id) on delete cascade,
 token_hash text not null unique,
 invite_email text check(invite_email is null or length(invite_email) between 5 and 255),
 role text not null check(role in ('editor','viewer')),
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default (now()+interval '72 hours'),
 accepted_at timestamptz,
 revoked_at timestamptz
);
create index if not exists viaja_invites_trip_idx on public.trip_invitations(trip_id,created_at desc);
alter table public.trip_members enable row level security;
alter table public.trip_invitations enable row level security;
revoke all on public.trip_members,public.trip_invitations from public,anon,authenticated;
grant select on public.trip_members to authenticated;
grant all on public.trip_members,public.trip_invitations to service_role;

-- Private helper breaks recursive RLS evaluation of trips <-> trip_members.
create or replace function private.viaja_trip_role(p_trip_id uuid)
returns text language sql stable security definer set search_path='' as $$
select case
 when auth.uid() is null then null
 when exists(select 1 from public.trips t where t.id=p_trip_id and t.user_id=auth.uid()) then 'owner'
 else (select m.role from public.trip_members m where m.trip_id=p_trip_id and m.user_id=auth.uid() limit 1)
end
$$;
revoke all on function private.viaja_trip_role(uuid) from public,anon,authenticated;
grant execute on function private.viaja_trip_role(uuid) to authenticated;
drop policy if exists trips_select_self on public.trips;
create policy trips_select_self on public.trips for select to authenticated
using (private.viaja_trip_role(id) is not null);
create policy viaja_members_read_team on public.trip_members for select to authenticated
using(private.viaja_trip_role(trip_id) is not null);

-- Owner and editors save with compare-and-swap; viewers cannot write.
create or replace function public.viaja_save_shared_trip(p_trip_id uuid,p_document jsonb,p_expected_version integer default null)
returns integer language plpgsql security definer set search_path='' as $$
declare v integer; r text;
begin
 if auth.uid() is null or p_trip_id is null or p_document is null or
    pg_catalog.jsonb_typeof(p_document)<>'object' or
    p_document->>'id' <> p_trip_id::text or
    pg_catalog.length(p_document::text)>2000000 then
   raise exception 'INVALID_TRIP_DOCUMENT';
 end if;
 r:=private.viaja_trip_role(p_trip_id);
 if r is null then
   if p_expected_version is not null then raise exception 'TRIP_NOT_FOUND_OR_DENIED'; end if;
   insert into public.trips(id,user_id,document,schema_version)
     values(p_trip_id,auth.uid(),p_document,1)
   on conflict(id) do nothing returning version into v;
   if v is null then raise exception 'TRIP_CONFLICT'; end if;
   return v;
 end if;
 if r='viewer' then raise exception 'READ_ONLY_TRIP'; end if;
 if p_expected_version is null or p_expected_version<1 then raise exception 'TRIP_CONFLICT'; end if;
 update public.trips set document=p_document
  where id=p_trip_id and version=p_expected_version returning version into v;
 if v is null then raise exception 'TRIP_CONFLICT'; end if;
 return v;
end $$;
revoke all on function public.viaja_save_shared_trip(uuid,jsonb,integer) from public,anon,authenticated;
grant execute on function public.viaja_save_shared_trip(uuid,jsonb,integer) to authenticated;

create or replace function public.viaja_create_trip_invite(p_trip_id uuid,p_role text,p_email text default null)
returns text language plpgsql security definer set search_path='' as $$
declare token text; normalized_email text;
begin
 if auth.uid() is null or private.viaja_trip_role(p_trip_id)<>'owner' then raise exception 'OWNER_REQUIRED'; end if;
 if p_role not in ('editor','viewer') then raise exception 'INVALID_ROLE'; end if;
 normalized_email:=nullif(pg_catalog.lower(pg_catalog.btrim(p_email)),'');
 if normalized_email is not null and (length(normalized_email)>255 or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$') then
  raise exception 'INVALID_EMAIL';
 end if;
 if (select count(*) from public.trip_invitations where created_by=auth.uid() and created_at>now()-interval '24 hours')>=20
 then raise exception 'INVITE_RATE_LIMIT'; end if;
 token:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');
 insert into public.trip_invitations(trip_id,created_by,token_hash,invite_email,role)
 values(p_trip_id,auth.uid(),md5(token),normalized_email,p_role);
 return token;
end $$;
revoke all on function public.viaja_create_trip_invite(uuid,text,text) from public,anon,authenticated;
grant execute on function public.viaja_create_trip_invite(uuid,text,text) to authenticated;

create or replace function public.viaja_accept_trip_invite(p_token text)
returns uuid language plpgsql security definer set search_path='' as $$
declare inv public.trip_invitations%rowtype; account_email text;
begin
 if auth.uid() is null or p_token is null or p_token !~ '^[0-9a-f]{64}$' then
  raise exception 'INVALID_INVITE';
 end if;
 select * into inv from public.trip_invitations where token_hash=md5(p_token) for update;
 if not found or inv.revoked_at is not null or inv.accepted_at is not null or inv.expires_at<=now()
 then raise exception 'INVITE_EXPIRED'; end if;
 select pg_catalog.lower(email) into account_email from auth.users where id=auth.uid();
 if inv.invite_email is not null and inv.invite_email<>account_email then
  raise exception 'INVITE_EMAIL_MISMATCH'; end if;
 if exists(select 1 from public.trips where id=inv.trip_id and user_id=auth.uid()) then
  raise exception 'OWNER_CANNOT_JOIN'; end if;
 insert into public.trip_members(trip_id,user_id,role,invited_by)
 values(inv.trip_id,auth.uid(),inv.role,inv.created_by)
 on conflict(trip_id,user_id) do update set role=excluded.role;
 update public.trip_invitations set accepted_at=now() where id=inv.id;
 return inv.trip_id;
end $$;
revoke all on function public.viaja_accept_trip_invite(text) from public,anon,authenticated;
grant execute on function public.viaja_accept_trip_invite(text) to authenticated;

create or replace function public.viaja_list_trip_invitations(p_trip_id uuid)
returns table(id uuid,invite_email text,role text,expires_at timestamptz,accepted_at timestamptz,revoked_at timestamptz)
language plpgsql security definer set search_path='' as $$
begin
 if private.viaja_trip_role(p_trip_id)<>'owner' then raise exception 'OWNER_REQUIRED'; end if;
 return query select i.id,i.invite_email,i.role,i.expires_at,i.accepted_at,i.revoked_at
 from public.trip_invitations i where i.trip_id=p_trip_id order by i.created_at desc limit 50;
end $$;
revoke all on function public.viaja_list_trip_invitations(uuid) from public,anon,authenticated;
grant execute on function public.viaja_list_trip_invitations(uuid) to authenticated;

create or replace function public.viaja_revoke_trip_invite(p_invite_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare changed integer;
begin
 update public.trip_invitations i set revoked_at=now()
 where i.id=p_invite_id and i.revoked_at is null and i.accepted_at is null
 and private.viaja_trip_role(i.trip_id)='owner';
 get diagnostics changed=row_count;
 return changed=1;
end $$;
revoke all on function public.viaja_revoke_trip_invite(uuid) from public,anon,authenticated;
grant execute on function public.viaja_revoke_trip_invite(uuid) to authenticated;

create or replace function public.viaja_remove_trip_member(p_trip_id uuid,p_user_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare changed integer;
begin
 if auth.uid() is null or (auth.uid()<>p_user_id and private.viaja_trip_role(p_trip_id)<>'owner') then
  raise exception 'PERMISSION_DENIED'; end if;
 delete from public.trip_members where trip_id=p_trip_id and user_id=p_user_id;
 get diagnostics changed=row_count;
 return changed=1;
end $$;
revoke all on function public.viaja_remove_trip_member(uuid,uuid) from public,anon,authenticated;
grant execute on function public.viaja_remove_trip_member(uuid,uuid) to authenticated;
commit;
