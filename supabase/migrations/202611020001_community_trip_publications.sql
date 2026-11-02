-- Shared Viaja itineraries: isolated publication snapshots, not private trips.
-- Publishing is explicit; there are no existing publications at migration time.
begin;

create function public.viaja_community_content_safe(payload jsonb)
returns boolean language plpgsql immutable set search_path = ''
as $$
declare day jsonb; activity jsonb; stop jsonb;
begin
 if pg_catalog.jsonb_typeof(payload) <> 'object' then return false; end if;
 if payload - 'route' - 'days' <> '{}'::jsonb then return false; end if;
 if pg_catalog.jsonb_typeof(payload->'route') <> 'array'
    or pg_catalog.jsonb_typeof(payload->'days') <> 'array' then return false; end if;
 if pg_catalog.jsonb_array_length(payload->'route') < 1
    or pg_catalog.jsonb_array_length(payload->'route') > 8
    or pg_catalog.jsonb_array_length(payload->'days') < 1
    or pg_catalog.jsonb_array_length(payload->'days') > 31 then return false; end if;
 for stop in select value from pg_catalog.jsonb_array_elements(payload->'route') loop
  if pg_catalog.jsonb_typeof(stop)<>'string' or length(stop#>>'{}') > 180 then return false; end if;
 end loop;
 for day in select value from pg_catalog.jsonb_array_elements(payload->'days') loop
  if pg_catalog.jsonb_typeof(day)<>'object'
    or day - 'title' - 'advice' - 'activities'<>'{}'::jsonb
    or pg_catalog.jsonb_typeof(day->'title')<>'string'
    or length(day->>'title') > 150
    or pg_catalog.jsonb_typeof(day->'activities') <> 'array'
    or pg_catalog.jsonb_array_length(day->'activities') > 25 then return false; end if;
  if day ? 'advice' and (pg_catalog.jsonb_typeof(day->'advice')<>'string' or length(day->>'advice')>1500)
    then return false; end if;
  for activity in select value from pg_catalog.jsonb_array_elements(day->'activities') loop
   if pg_catalog.jsonb_typeof(activity)<>'object'
     or activity - 'title' - 'description' - 'time' - 'duration' - 'location'<>'{}'::jsonb
     or pg_catalog.jsonb_typeof(activity->'title')<>'string'
     or pg_catalog.jsonb_typeof(activity->'description')<>'string'
     or length(activity->>'title')>150
     or length(activity->>'description')>1500 then return false; end if;
   if activity ? 'time' and (pg_catalog.jsonb_typeof(activity->'time')<>'string' or length(activity->>'time')>12)
     then return false; end if;
   if activity ? 'duration' and (pg_catalog.jsonb_typeof(activity->'duration')<>'string' or length(activity->>'duration')>60)
     then return false; end if;
   if activity ? 'location' and (pg_catalog.jsonb_typeof(activity->'location')<>'string' or length(activity->>'location')>200)
     then return false; end if;
  end loop;
 end loop;
 return true;
exception when others then return false;
end;
$$;

create table public.community_trips (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 source_trip_id uuid not null unique references public.trips(id) on delete cascade,
 title text not null check (char_length(title) between 2 and 180),
 destination text not null check (char_length(destination) between 2 and 180),
 days_count integer not null check (days_count between 1 and 31),
 pace text not null default 'Equilibrado' check (char_length(pace) <= 30),
 transport text not null default '' check (char_length(transport) <= 40),
 content jsonb not null check (public.viaja_community_content_safe(content) and pg_column_size(content)<=200000),
 published boolean not null default true,
 published_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint community_trip_day_count check (days_count=pg_catalog.jsonb_array_length(content->'days'))
);
create index community_trips_public_recent on public.community_trips(published_at desc) where published=true;
create index community_trips_owner on public.community_trips(user_id,source_trip_id);
create trigger community_trips_updated_at before update on public.community_trips
for each row execute function public.viaja_touch_updated_at();

alter table public.community_trips enable row level security;
revoke all on public.community_trips from public, anon, authenticated;
grant select(id,title,destination,days_count,pace,transport,content,published_at) on public.community_trips to anon;
grant select,insert,update,delete on public.community_trips to authenticated;
grant all on public.community_trips to service_role;

-- SELECT is public only for consciously published copies, or private to the author.
create policy community_trips_read on public.community_trips for select to anon,authenticated
using (published=true or user_id=(select auth.uid()));
create policy community_trips_insert_self on public.community_trips for insert to authenticated
with check (
 user_id=(select auth.uid()) and
 exists (select 1 from public.trips t where t.id=source_trip_id and t.user_id=(select auth.uid()))
);
create policy community_trips_update_self on public.community_trips for update to authenticated
using (user_id=(select auth.uid()))
with check (
 user_id=(select auth.uid()) and
 exists (select 1 from public.trips t where t.id=source_trip_id and t.user_id=(select auth.uid()))
);
create policy community_trips_delete_self on public.community_trips for delete to authenticated
using (user_id=(select auth.uid()));
commit;
