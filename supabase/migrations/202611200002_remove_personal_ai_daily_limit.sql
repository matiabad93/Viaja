-- Remove Viaja's artificial 10-successful-generations-per-24h user limit.
-- The global daily circuit breaker remains to protect provider costs and abuse.
-- Only one request per account may be in flight at a time.
create or replace function public.viaja_reserve_ai_request(
  p_user_id uuid, p_request_id uuid
) returns jsonb language plpgsql security definer set search_path='' as $$
declare global_count integer; active_count integer;
begin
  if p_user_id is null or p_request_id is null
     or not exists(select 1 from auth.users where id=p_user_id) then
    return pg_catalog.jsonb_build_object('allowed',false,'reason','invalid');
  end if;

  -- Serialize reservations to avoid races across accounts.
  perform pg_catalog.pg_advisory_xact_lock(47125,1001);

  -- Counts every attempt, including failures, because a failed model call
  -- may still consume provider resources. No personal 24-hour counter.
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
  return pg_catalog.jsonb_build_object('allowed',true);
end;
$$;

-- Privileged backend only: the client must not reserve AI credits directly.
revoke all on function public.viaja_reserve_ai_request(uuid,uuid) from public,anon,authenticated;
grant execute on function public.viaja_reserve_ai_request(uuid,uuid) to service_role;
