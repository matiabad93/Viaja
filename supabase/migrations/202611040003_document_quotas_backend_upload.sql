-- Viaja security P1.2 — shared per-account document quota.
-- Additive public metadata guardrails; Storage bytes are written by a trusted
-- Cloudflare endpoint using the server-only Supabase secret key. No changes
-- to storage.objects schema or direct SQL manipulation of Storage metadata.
begin;

create table if not exists private.viaja_document_upload_events(
  event_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  declared_bytes bigint not null check(declared_bytes between 1 and 10485760),
  created_at timestamptz not null default now()
);
create index if not exists viaja_document_upload_events_user_window
  on private.viaja_document_upload_events(user_id, created_at desc);
revoke all on private.viaja_document_upload_events from public,anon,authenticated;
grant select,insert on private.viaja_document_upload_events to service_role;

-- Each successful metadata registration counts as an attempt for 24h even if
-- the browser later deletes its placeholder row on a failed upload.
-- Advisory lock serializes simultaneous uploads from the same account across
-- both metadata tables, preventing quota oversubscription by racing requests.
create or replace function private.viaja_enforce_document_quota()
returns trigger
language plpgsql security definer set search_path='' as $$
declare
  v_owner uuid;
  v_authenticated uuid := (select auth.uid());
  v_count bigint;
  v_bytes bigint;
  v_daily bigint;
begin
  if tg_table_schema <> 'public' or tg_table_name not in ('reservation_files','trip_documents') then
    raise exception 'UNSUPPORTED_DOCUMENT_TABLE' using errcode='23514';
  end if;

  if tg_table_name='reservation_files' then
    v_owner := new.owner_id;
  else
    v_owner := new.uploaded_by;
  end if;

  if v_owner is null or v_authenticated is distinct from v_owner then
    raise exception 'DOCUMENT_OWNER_REQUIRED' using errcode='42501';
  end if;

  if new.size_bytes is null or new.size_bytes < 1 or new.size_bytes > 10485760 then
    raise exception 'DOCUMENT_FILE_LIMIT_10MB' using errcode='23514';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(61051926,pg_catalog.hashtext(v_owner::text));

  select count(*),coalesce(sum(t.size_bytes),0)::bigint
  into v_count,v_bytes
  from (
    select r.size_bytes from public.reservation_files r where r.owner_id=v_owner
    union all
    select d.size_bytes from public.trip_documents d where d.uploaded_by=v_owner
  ) t;

  if v_count >= 50 then
    raise exception 'DOCUMENT_COUNT_LIMIT_50' using errcode='23514';
  end if;

  if v_bytes + new.size_bytes > 104857600 then
    raise exception 'DOCUMENT_STORAGE_LIMIT_100MB' using errcode='23514';
  end if;

  select count(*) into v_daily
    from private.viaja_document_upload_events e
    where e.user_id=v_owner and e.created_at > now()-interval '24 hours';
  if v_daily >= 30 then
    raise exception 'DOCUMENT_UPLOAD_LIMIT_30_PER_DAY' using errcode='23514';
  end if;

  insert into private.viaja_document_upload_events(user_id,declared_bytes)
  values(v_owner,new.size_bytes);
  return new;
end $$;
revoke all on function private.viaja_enforce_document_quota() from public,anon,authenticated;
grant execute on function private.viaja_enforce_document_quota() to service_role;

drop trigger if exists viaja_reservation_document_quota on public.reservation_files;
create trigger viaja_reservation_document_quota
 before insert on public.reservation_files for each row
 execute function private.viaja_enforce_document_quota();

drop trigger if exists viaja_trip_document_quota on public.trip_documents;
create trigger viaja_trip_document_quota
 before insert on public.trip_documents for each row
 execute function private.viaja_enforce_document_quota();

-- Lightweight per-user stats exposed as an authenticated RPC, no cross-user
-- information. The quota is enforced above regardless of the UI.
create or replace function public.viaja_document_usage()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
 v_user uuid := (select auth.uid());
 v_count bigint;
 v_bytes bigint;
 v_daily bigint;
begin
 if v_user is null then
  raise exception 'DOCUMENT_AUTH_REQUIRED' using errcode='42501';
 end if;
 select count(*),coalesce(sum(t.size_bytes),0)::bigint into v_count,v_bytes from (
  select r.size_bytes from public.reservation_files r where r.owner_id=v_user
  union all
  select d.size_bytes from public.trip_documents d where d.uploaded_by=v_user
 ) t;
 select count(*) into v_daily from private.viaja_document_upload_events e
  where e.user_id=v_user and e.created_at > now()-interval '24 hours';
 return pg_catalog.jsonb_build_object(
  'files',v_count,'maxFiles',50,
  'bytes',v_bytes,'maxBytes',104857600,
  'uploadsLast24h',v_daily,'maxUploadsLast24h',30
 );
end $$;
revoke all on function public.viaja_document_usage() from public,anon,authenticated;
grant execute on function public.viaja_document_usage() to authenticated,service_role;

-- Only a freshly authenticated owner/editor may use the server endpoint to
-- upload a document to a shared trip. No exposure of other users' rows.
create or replace function public.viaja_can_upload_trip_document(p_document_id uuid)
returns boolean language sql stable security invoker set search_path='' as $$
 select exists (
  select 1 from public.trip_documents d
  where d.id=p_document_id
   and d.uploaded_by=(select auth.uid())
   and private.viaja_trip_role(d.trip_id) in ('owner','editor')
 )
$$;
revoke all on function public.viaja_can_upload_trip_document(uuid) from public,anon,authenticated;
grant execute on function public.viaja_can_upload_trip_document(uuid) to authenticated,service_role;

-- Direct client Storage uploads are no longer permitted. Only the backend
-- with a secret key can upload, AFTER verifying JWT, DB RLS, declared size,
-- actual bytes, allowed MIME, and ownership/edit permission.
-- SELECT/DELETE RLS is preserved unchanged for member downloads and cleanup.
drop policy if exists viaja_reservation_object_upload on storage.objects;
drop policy if exists viaja_storage_doc_editor_insert on storage.objects;

commit;
