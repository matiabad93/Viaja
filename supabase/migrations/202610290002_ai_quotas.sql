-- Viaja v1: atomic admission control for paid AI requests.
-- Every request is reserved in one database transaction before hitting OpenAI.
-- Counts include failed requests to keep the budget ceiling conservative.
begin;

create or replace function public.viaja_reserve_ai_request(
  p_user_id uuid,
  p_request_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  user_count integer;
  global_count integer;
  recent_count integer;
  active_count integer;
begin
  if p_user_id is null or p_request_id is null then
    return pg_catalog.jsonb_build_object('allowed', false, 'reason', 'invalid');
  end if;
  if not exists (select 1 from auth.users where id=p_user_id) then
    return pg_catalog.jsonb_build_object('allowed', false, 'reason', 'invalid');
  end if;

  -- Serialize ALL admissions, preventing races across Cloudflare instances.
  perform pg_catalog.pg_advisory_xact_lock(47125, 1001);

  select count(*) into user_count
    from public.ai_usage
   where user_id=p_user_id and created_at > pg_catalog.now() - interval '24 hours';
  if user_count >= 2 then
    return pg_catalog.jsonb_build_object('allowed', false, 'reason', 'user_daily_limit');
  end if;

  select count(*) into global_count
    from public.ai_usage
   where created_at > pg_catalog.now() - interval '24 hours';
  if global_count >= 40 then
    return pg_catalog.jsonb_build_object('allowed', false, 'reason', 'global_daily_limit');
  end if;

  select count(*) into recent_count
    from public.ai_usage
   where user_id=p_user_id and created_at > pg_catalog.now() - interval '5 minutes';
  if recent_count > 0 then
    return pg_catalog.jsonb_build_object('allowed', false, 'reason', 'cooldown');
  end if;

  select count(*) into active_count
    from public.ai_usage
   where user_id=p_user_id and status='reserved'
     and created_at > pg_catalog.now() - interval '10 minutes';
  if active_count > 0 then
    return pg_catalog.jsonb_build_object('allowed', false, 'reason', 'request_in_progress');
  end if;

  insert into public.ai_usage(user_id,request_id,status)
    values (p_user_id,p_request_id,'reserved');
  return pg_catalog.jsonb_build_object('allowed', true, 'remaining_user_today',1-user_count);
end;
$$;

create or replace function public.viaja_finalize_ai_request(
  p_request_id uuid,
  p_status text,
  p_model text default null
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare affected integer;
begin
  if p_request_id is null or p_status not in ('completed','failed') then
    return false;
  end if;
  update public.ai_usage
     set status=p_status,model=pg_catalog.left(p_model,100)
   where request_id=p_request_id and status='reserved';
  get diagnostics affected = row_count;
  return affected=1;
end;
$$;

-- Explicitly restrict both RPCs to trusted backend credentials.
revoke all on function public.viaja_reserve_ai_request(uuid,uuid) from public,anon,authenticated;
revoke all on function public.viaja_finalize_ai_request(uuid,text,text) from public,anon,authenticated;
grant execute on function public.viaja_reserve_ai_request(uuid,uuid) to service_role;
grant execute on function public.viaja_finalize_ai_request(uuid,text,text) to service_role;

commit;
