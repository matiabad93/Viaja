-- Viaja 1.1 · Entrega C — private travel documents.
-- Additive: does not modify existing trips, community publications or Tupã Travel.
-- Storage file operations MUST use the Storage API; SQL only configures buckets/policies.
begin;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values (
  'trip-documents','trip-documents',false,10485760,
  array['application/pdf','image/jpeg','image/png','image/webp','text/calendar']::text[]
)
on conflict (id) do update set
  public=false,
  file_size_limit=10485760,
  allowed_mime_types=excluded.allowed_mime_types;

create table if not exists public.trip_documents (
 id uuid primary key,
 trip_id uuid not null references public.trips(id) on delete cascade,
 uploaded_by uuid not null references auth.users(id),
 storage_path text not null unique,
 filename text not null,
 mime_type text not null
   check (mime_type in ('application/pdf','image/jpeg','image/png','image/webp','text/calendar')),
 size_bytes bigint not null check (size_bytes between 1 and 10485760),
 related_type text not null default 'trip'
   check (related_type in ('trip','accommodation','transport')),
 related_id text,
 created_at timestamptz not null default now(),
 constraint viaja_doc_filename_safe check (
    length(filename) between 1 and 180
    and filename !~ '[/\\]'
    and filename !~ '[[:cntrl:]]'
 ),
 constraint viaja_doc_link_valid check (
   (related_type='trip' and related_id is null)
   or (related_type in ('accommodation','transport') and length(related_id) between 1 and 100)
 ),
 constraint viaja_doc_storage_path_exact check (
  storage_path = trip_id::text || '/' || id::text || '/document.' ||
    (case mime_type
      when 'application/pdf' then 'pdf'
      when 'image/jpeg' then 'jpg'
      when 'image/png' then 'png'
      when 'image/webp' then 'webp'
      when 'text/calendar' then 'ics'
     end)
 )
);
create index if not exists viaja_trip_documents_trip_date_idx
 on public.trip_documents(trip_id,created_at desc);
create index if not exists viaja_trip_documents_uploader_idx
 on public.trip_documents(uploaded_by);

alter table public.trip_documents enable row level security;
revoke all on public.trip_documents from public,anon,authenticated;
grant select,insert,delete on public.trip_documents to authenticated;
grant all on public.trip_documents to service_role;

-- All authenticated members can inspect and download their team's documents.
create policy viaja_doc_member_read on public.trip_documents
 for select to authenticated
 using (private.viaja_trip_role(trip_id) is not null);

-- Documents are immutable after upload. Only the owner/editor may add/remove.
create policy viaja_doc_editor_insert on public.trip_documents
 for insert to authenticated
 with check (
   uploaded_by=(select auth.uid())
   and private.viaja_trip_role(trip_id) in ('owner','editor')
 );
create policy viaja_doc_editor_delete on public.trip_documents
 for delete to authenticated
 using (private.viaja_trip_role(trip_id) in ('owner','editor'));

-- Parse only our exact opaque object-key format. Never cast arbitrary user input to uuid.
create or replace function private.viaja_doc_trip_id(p_name text)
returns uuid language sql stable security invoker set search_path='' as $$
 select case
   when p_name ~
    '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/document[.](pdf|jpg|png|webp|ics)$'
   then pg_catalog.split_part(p_name,'/',1)::uuid
   else null::uuid
 end
$$;
revoke all on function private.viaja_doc_trip_id(text) from public,anon,authenticated;
grant execute on function private.viaja_doc_trip_id(text) to authenticated;

-- Storage RLS independently checks membership and the corresponding registry row.
-- No public URL, no unauthenticated reads, no object overwrite or rename.
create policy viaja_storage_doc_member_read on storage.objects
 for select to authenticated
 using (
  bucket_id='trip-documents'
  and private.viaja_doc_trip_id(name) is not null
  and private.viaja_trip_role(private.viaja_doc_trip_id(name)) is not null
  and exists (
    select 1 from public.trip_documents d
    where d.storage_path=name and d.trip_id=private.viaja_doc_trip_id(name)
  )
 );

create policy viaja_storage_doc_editor_insert on storage.objects
 for insert to authenticated
 with check (
  bucket_id='trip-documents'
  and private.viaja_doc_trip_id(name) is not null
  and private.viaja_trip_role(private.viaja_doc_trip_id(name)) in ('owner','editor')
  and exists (
    select 1 from public.trip_documents d
    where d.storage_path=name
      and d.trip_id=private.viaja_doc_trip_id(name)
      and d.uploaded_by=(select auth.uid())
  )
 );

create policy viaja_storage_doc_editor_delete on storage.objects
 for delete to authenticated
 using (
  bucket_id='trip-documents'
  and private.viaja_doc_trip_id(name) is not null
  and private.viaja_trip_role(private.viaja_doc_trip_id(name)) in ('owner','editor')
  and exists (
    select 1 from public.trip_documents d
    where d.storage_path=name and d.trip_id=private.viaja_doc_trip_id(name)
  )
 );

commit;
