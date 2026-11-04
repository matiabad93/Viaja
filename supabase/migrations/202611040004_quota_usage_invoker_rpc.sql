-- Viaja P1.2 follow-up: avoid an exposed SECURITY DEFINER RPC in public.
-- The safe public entrypoint is SECURITY INVOKER. The private worker is
-- SECURITY DEFINER with no caller parameters and auth.uid scoped access.
begin;

create or replace function private.viaja_document_usage_impl()
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
revoke all on function private.viaja_document_usage_impl() from public,anon,authenticated;
grant execute on function private.viaja_document_usage_impl() to authenticated,service_role;

create or replace function public.viaja_document_usage()
returns jsonb language sql stable security invoker set search_path='' as $$
 select private.viaja_document_usage_impl()
$$;
revoke all on function public.viaja_document_usage() from public,anon,authenticated;
grant execute on function public.viaja_document_usage() to authenticated,service_role;

commit;
