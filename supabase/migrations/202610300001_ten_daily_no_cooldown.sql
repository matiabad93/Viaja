-- Viaja beta: allow 10 AI requests per authenticated user every rolling 24 hours.
-- No minimum wait between sequential requests; keep the global daily cap and
-- the guard against duplicate in-flight requests.
create or replace function public.viaja_reserve_ai_request(
  p_user_id uuid, p_request_id uuid
) returns jsonb language plpgsql security definer set search_path='' as $$
declare user_count integer; global_count integer; active_count integer;
begin
  if p_user_id is null or p_request_id is null
     or not exists(select 1 from auth.users where id=p_user_id) then
    return pg_catalog.jsonb_build_object('allowed',false,'reason','invalid');
  end if;
  perform pg_catalog.pg_advisory_xact_lock(47125,1001);
  select count(*) into user_count from public.ai_usage
   where user_id=p_user_id and created_at>pg_catalog.now()-interval '24 hours';
  if user_count>=10 then
    return pg_catalog.jsonb_build_object('allowed',false,'reason','user_daily_limit');
  end if;
  select count(*) into global_count from public.ai_usage
   where created_at>pg_catalog.now()-interval '24 hours';
  if global_count>=40 then
    return pg_catalog.jsonb_build_object('allowed',false,'reason','global_daily_limit');
  end if;
  select count(*) into active_count from public.ai_usage
   where user_id=p_user_id and status='reserved'
     and created_at>pg_catalog.now()-interval '10 minutes';
  if active_count>0 then
    return pg_catalog.jsonb_build_object('allowed',false,'reason','request_in_progress');
  end if;
  insert into public.ai_usage(user_id,request_id,status)
    values(p_user_id,p_request_id,'reserved');
  return pg_catalog.jsonb_build_object('allowed',true,'remaining_user_today',9-user_count);
end;
$$;
revoke all on function public.viaja_reserve_ai_request(uuid,uuid) from public,anon,authenticated;
grant execute on function public.viaja_reserve_ai_request(uuid,uuid) to service_role;
