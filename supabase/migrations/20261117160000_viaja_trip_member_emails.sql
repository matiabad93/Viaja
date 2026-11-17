-- Viaja · expose member emails only to authenticated people on that trip.
-- No broad profile directory, service key in the browser or public auth.users view.
begin;
create or replace function private.viaja_list_trip_member_emails_impl(p_trip_id uuid)
returns table(user_id uuid,email text)
language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or p_trip_id is null or private.viaja_trip_role(p_trip_id) is null then
  raise exception 'TRIP_NOT_FOUND_OR_DENIED';
 end if;
 return query
 select u.id, u.email::text
 from auth.users u
 join (
  select t.user_id from public.trips t where t.id=p_trip_id
  union
  select m.user_id from public.trip_members m where m.trip_id=p_trip_id
 ) people on people.user_id=u.id
 where u.email is not null
 order by u.id
 limit 51;
end $$;
revoke all on function private.viaja_list_trip_member_emails_impl(uuid) from public,anon,authenticated;
grant execute on function private.viaja_list_trip_member_emails_impl(uuid) to authenticated;

-- Privileged auth.users access stays in private; exposed RPC is an invoker wrapper.
create or replace function public.viaja_list_trip_member_emails(p_trip_id uuid)
returns table(user_id uuid,email text)
language sql stable security invoker set search_path='' as $$
select * from private.viaja_list_trip_member_emails_impl($1)
$$;
revoke all on function public.viaja_list_trip_member_emails(uuid) from public,anon,authenticated;
grant execute on function public.viaja_list_trip_member_emails(uuid) to authenticated;
commit;
