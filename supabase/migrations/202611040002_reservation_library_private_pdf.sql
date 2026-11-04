-- Viaja 1.1 · Entrega C / Centro de Reservas personales (PDF exclusivamente).
-- New additive schema. Do not change existing trip_documents or public trips.
begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('reservation-pdfs','reservation-pdfs',false,10485760,array['application/pdf']::text[])
on conflict(id) do update
set public=false,file_size_limit=10485760,allowed_mime_types=excluded.allowed_mime_types;

create table if not exists public.reservation_files(
 id uuid primary key,
 owner_id uuid not null references auth.users(id) on delete cascade,
 filename text not null check(length(filename) between 1 and 180 and filename !~ '[/\\]' and filename !~ '[[:cntrl:]]'),
 storage_path text not null unique,
 size_bytes bigint not null check(size_bytes between 1 and 10485760),
 mime_type text not null default 'application/pdf' check(mime_type='application/pdf'),
 kind text not null default 'unclassified' check(kind in ('unclassified','flight','accommodation','mixed','other')),
 title text not null default '' check(length(title)<=180),
 details jsonb not null default '{}'::jsonb
  check(jsonb_typeof(details)='object' and length(details::text)<=16000),
 linked_trip_id uuid references public.trips(id) on delete set null,
 reviewed_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint viaja_reservation_object_path
  check(storage_path=owner_id::text || '/' || id::text || '/source.pdf')
);
create index if not exists viaja_reservation_owner_created
 on public.reservation_files(owner_id,created_at desc);
create index if not exists viaja_reservation_linked_trip
 on public.reservation_files(linked_trip_id) where linked_trip_id is not null;
alter table public.reservation_files enable row level security;
revoke all on public.reservation_files from public,anon,authenticated;
grant select,insert,delete on public.reservation_files to authenticated;
grant update(kind,title,details,linked_trip_id,reviewed_at) on public.reservation_files to authenticated;
grant all on public.reservation_files to service_role;

create policy viaja_reservation_owner_read on public.reservation_files
 for select to authenticated
 using(owner_id=(select auth.uid()));
create policy viaja_reservation_owner_insert on public.reservation_files
 for insert to authenticated
 with check(
  owner_id=(select auth.uid())
  and (linked_trip_id is null or private.viaja_trip_role(linked_trip_id) in ('owner','editor'))
 );
create policy viaja_reservation_owner_edit on public.reservation_files
 for update to authenticated
 using(owner_id=(select auth.uid()))
 with check(
  owner_id=(select auth.uid())
  and (linked_trip_id is null or private.viaja_trip_role(linked_trip_id) in ('owner','editor'))
 );
create policy viaja_reservation_owner_delete on public.reservation_files
 for delete to authenticated using(owner_id=(select auth.uid()));

-- Storage operations must match the user's own metadata. The
-- path constraint prevents writing to an arbitrary key or bucket.
create policy viaja_reservation_object_read on storage.objects
 for select to authenticated using(
  bucket_id='reservation-pdfs'
  and exists(select 1 from public.reservation_files r
     where r.storage_path=name and r.owner_id=(select auth.uid()))
 );
create policy viaja_reservation_object_upload on storage.objects
 for insert to authenticated with check(
  bucket_id='reservation-pdfs'
  and exists(select 1 from public.reservation_files r
    where r.storage_path=name and r.owner_id=(select auth.uid()))
 );
create policy viaja_reservation_object_delete on storage.objects
 for delete to authenticated using(
  bucket_id='reservation-pdfs'
  and exists(select 1 from public.reservation_files r
    where r.storage_path=name and r.owner_id=(select auth.uid()))
 );
-- No Storage UPDATE policy: overwrite/move/copy into the bucket cannot be authorized.

create table if not exists private.viaja_pdf_extract_requests (
 request_id uuid primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 status text not null default 'reserved'
   check(status in ('reserved','succeeded','failed'))
);
create index if not exists viaja_pdf_extract_user_window
 on private.viaja_pdf_extract_requests(user_id,created_at desc);
create index if not exists viaja_pdf_extract_global_window
 on private.viaja_pdf_extract_requests(created_at desc);
revoke all on private.viaja_pdf_extract_requests from public,anon,authenticated;
grant all on private.viaja_pdf_extract_requests to service_role;

-- Trust only a server-authenticated user ID, never a client-supplied user ID.
-- Lock globally so concurrent requests cannot oversubscribe either quota.
create or replace function private.viaja_pdf_reserve_impl(p_user_id uuid,p_request_id uuid)
 returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user int; v_global int;
begin
 if p_user_id is null or p_request_id is null or
    not exists(select 1 from auth.users u where u.id=p_user_id) then
   return jsonb_build_object('allowed',false,'reason','invalid_user');
 end if;
 perform pg_catalog.pg_advisory_xact_lock(887715110422::bigint);
 if exists(select 1 from private.viaja_pdf_extract_requests r where r.request_id=p_request_id) then
   return jsonb_build_object('allowed',false,'reason','duplicate_request');
 end if;
 select count(*) into v_user from private.viaja_pdf_extract_requests
   where user_id=p_user_id and created_at>=now()-interval '24 hours';
 select count(*) into v_global from private.viaja_pdf_extract_requests
   where created_at>=now()-interval '24 hours';
 if v_user>=3 then return jsonb_build_object('allowed',false,'reason','user_daily_limit');end if;
 if v_global>=60 then return jsonb_build_object('allowed',false,'reason','global_daily_limit');end if;
 insert into private.viaja_pdf_extract_requests(request_id,user_id)
   values(p_request_id,p_user_id);
 return jsonb_build_object('allowed',true);
end $$;
revoke all on function private.viaja_pdf_reserve_impl(uuid,uuid) from public,anon,authenticated;
grant execute on function private.viaja_pdf_reserve_impl(uuid,uuid) to service_role;
-- PostgREST only exposes a narrow server-only invoker RPC. Revoke from PUBLIC/anon/authenticated.
create or replace function public.viaja_reserve_pdf_extract(p_user_id uuid,p_request_id uuid)
 returns jsonb language sql security invoker set search_path='' as $$
 select private.viaja_pdf_reserve_impl($1,$2)
$$;
revoke all on function public.viaja_reserve_pdf_extract(uuid,uuid) from public,anon,authenticated;
grant execute on function public.viaja_reserve_pdf_extract(uuid,uuid) to service_role;
commit;
