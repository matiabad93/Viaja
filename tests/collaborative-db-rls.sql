\set ON_ERROR_STOP on
-- Owner can see existing trip, create an email-locked editor invitation.
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
do $$ begin
if (select count(*) from public.trips)<>1 then raise exception 'owner lost trip'; end if;
end $$;
create temporary table collab_test_tokens(key text primary key,token text not null);
insert into collab_test_tokens values('editor',public.viaja_create_trip_invite('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','editor','bob@example.com'));
-- A different signed-in user cannot use a recipient-specific invitation.
select set_config('request.jwt.claim.sub','44444444-4444-4444-8444-444444444444',false);
do $$ begin
 begin
  perform public.viaja_accept_trip_invite((select token from collab_test_tokens where key='editor'));
  raise exception 'wrong email unexpectedly accepted';
 exception when raise_exception then
  if sqlerrm <> 'INVITE_EMAIL_MISMATCH' then raise; end if;
 end;
end $$;
-- Bob is the intended editor, accepts once and reads the trip.
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
select public.viaja_accept_trip_invite((select token from collab_test_tokens where key='editor'));
do $$ begin
if (select count(*) from public.trips)<>1 then raise exception 'editor cannot read'; end if;
end $$;
select public.viaja_save_shared_trip('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
'{"id":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","trip":{"destination":"Roma con Alex"},"kind":"draft","createdAt":"2026-11-03"}',1);
do $$ begin
if (select version from public.trips where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')<>2 then raise exception 'version did not increment'; end if;
end $$;
-- The owner cannot overwrite the editor's change with a stale version.
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
do $$ begin
 begin
  perform public.viaja_save_shared_trip('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '{"id":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","trip":{"destination":"Stale"}}',1);
  raise exception 'stale edit unexpectedly overwrote';
 exception when raise_exception then
  if sqlerrm <> 'TRIP_CONFLICT' then raise; end if;
 end;
end $$;
-- Create a separate viewer invitation and accept as Carol.
insert into collab_test_tokens values('viewer',public.viaja_create_trip_invite('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','viewer',null));
select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',false);
select public.viaja_accept_trip_invite((select token from collab_test_tokens where key='viewer'));
do $$ begin
if (select count(*) from public.trips)<>1 then raise exception 'viewer cannot read'; end if;
 begin
  perform public.viaja_save_shared_trip('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '{"id":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","trip":{"destination":"Unauthorized"}}',2);
  raise exception 'viewer unexpectedly edited';
 exception when raise_exception then
  if sqlerrm <> 'READ_ONLY_TRIP' then raise; end if;
 end;
end $$;
-- Non-member Dana cannot read the trip, enumerate members or mint invitations.
select set_config('request.jwt.claim.sub','44444444-4444-4444-8444-444444444444',false);
do $$ begin
if (select count(*) from public.trips)<>0 then raise exception 'private trip leaked to nonmember'; end if;
if (select count(*) from public.trip_members)<>0 then raise exception 'member data leaked'; end if;
 begin
  perform public.viaja_create_trip_invite('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','editor',null);
  raise exception 'non-owner issued invite';
 exception when raise_exception then
  if sqlerrm <> 'OWNER_REQUIRED' then raise; end if;
 end;
 begin
  perform public.viaja_list_trip_invitations('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
  raise exception 'nonowner listed invitations';
 exception when raise_exception then
  if sqlerrm <> 'OWNER_REQUIRED' then raise; end if;
 end;
 begin
  perform public.viaja_remove_trip_member('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','22222222-2222-4222-8222-222222222222');
  raise exception 'nonowner revoked a different member';
 exception when raise_exception then
  if sqlerrm <> 'PERMISSION_DENIED' then raise; end if;
 end;
end $$;
-- Owner revokes editor membership; its RLS access must disappear immediately.
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
select public.viaja_remove_trip_member('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','22222222-2222-4222-8222-222222222222');
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
do $$ begin
if (select count(*) from public.trips)<>0 then raise exception 'revoked editor retained read access'; end if;
end $$;
-- The single-use invitation is not reusable by Bob.
do $$ begin
 begin
  perform public.viaja_accept_trip_invite((select token from collab_test_tokens where key='editor'));
  raise exception 'used invitation accepted again';
 exception when raise_exception then
  if sqlerrm <> 'INVITE_EXPIRED' then raise; end if;
 end;
end $$;
reset role;
select 'PASS collaboration RLS, invites, conflict detection, viewer and revocation' as status;
