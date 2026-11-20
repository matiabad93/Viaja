-- Public Viaja itineraries follow their source trip after subsequent saves.
-- Publication remains opt-in. A downloaded editable copy is never linked.
-- All data crossing into the public table is whitelisted server-side.
begin;

create or replace function public.viaja_community_content_safe(payload jsonb)
returns boolean language plpgsql immutable set search_path='' as $$
declare day jsonb; activity jsonb; stop jsonb;
begin
 if pg_catalog.jsonb_typeof(payload)<>'object' or payload-'route'-'days'<>'{}'::jsonb then return false; end if;
 if pg_catalog.jsonb_typeof(payload->'route')<>'array'
    or pg_catalog.jsonb_typeof(payload->'days')<>'array' then return false; end if;
 if pg_catalog.jsonb_array_length(payload->'route') not between 1 and 8
    or pg_catalog.jsonb_array_length(payload->'days') not between 1 and 31 then return false; end if;
 for stop in select value from pg_catalog.jsonb_array_elements(payload->'route') loop
  if pg_catalog.jsonb_typeof(stop)<>'string' or length(stop#>>'{}')>180 then return false; end if;
 end loop;
 for day in select value from pg_catalog.jsonb_array_elements(payload->'days') loop
  if pg_catalog.jsonb_typeof(day)<>'object'
     or day-'title'-'advice'-'activities'<>'{}'::jsonb
     or pg_catalog.jsonb_typeof(day->'title')<>'string'
     or length(day->>'title')>150
     or pg_catalog.jsonb_typeof(day->'activities')<>'array'
     or pg_catalog.jsonb_array_length(day->'activities')>25 then return false; end if;
  if day ? 'advice' and (pg_catalog.jsonb_typeof(day->'advice')<>'string' or length(day->>'advice')>1500) then return false; end if;
  for activity in select value from pg_catalog.jsonb_array_elements(day->'activities') loop
   if pg_catalog.jsonb_typeof(activity)<>'object'
      or activity-'title'-'description'-'kind'-'time'-'duration'-'location'<>'{}'::jsonb
      or pg_catalog.jsonb_typeof(activity->'title')<>'string'
      or pg_catalog.jsonb_typeof(activity->'description')<>'string'
      or length(activity->>'title')>150
      or length(activity->>'description')>1500 then return false; end if;
   if activity ? 'kind' and (pg_catalog.jsonb_typeof(activity->'kind')<>'string'
      or activity->>'kind' not in ('visit','transfer','meal','break')) then return false; end if;
   if activity ? 'time' and (pg_catalog.jsonb_typeof(activity->'time')<>'string'
      or length(activity->>'time')>12) then return false; end if;
   if activity ? 'duration' and (pg_catalog.jsonb_typeof(activity->'duration')<>'string'
      or length(activity->>'duration')>60) then return false; end if;
   if activity ? 'location' and (pg_catalog.jsonb_typeof(activity->'location')<>'string'
      or length(activity->>'location')>200) then return false; end if;
  end loop;
 end loop;
 return true;
exception when others then return false;
end;
$$;
-- The public validator is invoker-safe and remains callable by the existing table check.

create or replace function private.viaja_sync_published_trip()
returns trigger language plpgsql security definer set search_path='' as $$
declare
 v_trip jsonb; v_dest text; v_route jsonb; v_days jsonb='[]'::jsonb;
 v_day jsonb; v_activities jsonb; v_activity jsonb; v_content jsonb;
 v_entry jsonb; v_stop jsonb; v_count integer=0; v_has_activity boolean=false;
 v_title text; v_pace text; v_transport text; v_field text; v_value text;
begin
 -- Never publish an unpublished private trip, even after edits.
 if new.document is not distinct from old.document or
    not exists(select 1 from public.community_trips c where c.source_trip_id=new.id and c.published=true)
 then return new; end if;

 v_trip:=new.document->'trip';
 if pg_catalog.jsonb_typeof(v_trip)<>'object'
    or pg_catalog.jsonb_typeof(new.document->'itinerary')<>'array'
    or pg_catalog.jsonb_array_length(new.document->'itinerary') not between 1 and 31 then
  update public.community_trips set published=false where source_trip_id=new.id;
  return new;
 end if;
 v_dest:=pg_catalog.left(pg_catalog.btrim(coalesce(v_trip->>'destination','')),180);
 if length(v_dest)<2 then
  update public.community_trips set published=false where source_trip_id=new.id;
  return new;
 end if;
 v_route:=pg_catalog.jsonb_build_array(v_dest);
 if pg_catalog.jsonb_typeof(v_trip->'additionalDestinations')='array' then
  for v_stop in select value from pg_catalog.jsonb_array_elements(v_trip->'additionalDestinations') limit 7 loop
   if pg_catalog.jsonb_typeof(v_stop)='string' and pg_catalog.btrim(v_stop#>>'{}')<>'' then
    v_route:=v_route||pg_catalog.jsonb_build_array(pg_catalog.left(pg_catalog.btrim(v_stop#>>'{}'),180));
   end if;
  end loop;
 end if;

 for v_entry in select value from pg_catalog.jsonb_array_elements(new.document->'itinerary') loop
  v_count:=v_count+1;
  v_title:=pg_catalog.left(coalesce(nullif(pg_catalog.btrim(v_entry->>'title'),''),'Día '||v_count),150);
  v_activities:='[]'::jsonb;
  if pg_catalog.jsonb_typeof(v_entry->'activities')='array' then
   for v_stop in select value from pg_catalog.jsonb_array_elements(v_entry->'activities') limit 25 loop
    v_value:=pg_catalog.left(pg_catalog.btrim(coalesce(v_stop->>'title','')),150);
    if v_value='' then continue; end if;
    v_has_activity:=true;
    v_activity:=pg_catalog.jsonb_build_object(
      'title',v_value,'description',pg_catalog.left(pg_catalog.btrim(coalesce(v_stop->>'description','')),1500));
    v_value:=v_stop->>'kind';
    if v_value in ('visit','transfer','meal','break') then
     v_activity:=v_activity||pg_catalog.jsonb_build_object('kind',v_value);
    end if;
    foreach v_field in array array['time','duration','location'] loop
     v_value:=pg_catalog.btrim(coalesce(v_stop->>v_field,''));
     if v_value<>'' then
      v_activity:=v_activity||pg_catalog.jsonb_build_object(''||v_field,
       pg_catalog.left(v_value,case v_field when 'time' then 12 when 'duration' then 60 else 200 end));
     end if;
    end loop;
    v_activities:=v_activities||pg_catalog.jsonb_build_array(v_activity);
   end loop;
  end if;
  v_day:=pg_catalog.jsonb_build_object('title',v_title,'activities',v_activities);
  v_value:=pg_catalog.left(pg_catalog.btrim(coalesce(v_entry->>'advice','')),1500);
  if v_value<>'' then v_day:=v_day||pg_catalog.jsonb_build_object('advice',v_value); end if;
  v_days:=v_days||pg_catalog.jsonb_build_array(v_day);
 end loop;

 v_content:=pg_catalog.jsonb_build_object('route',v_route,'days',v_days);
 if not v_has_activity or not public.viaja_community_content_safe(v_content)
    or pg_catalog.pg_column_size(v_content)>200000 then
  -- An empty or malformed source must not leave an outdated plan public.
  update public.community_trips set published=false where source_trip_id=new.id;
  return new;
 end if;

 v_pace:=pg_catalog.left(pg_catalog.btrim(coalesce(v_trip->>'pace','Equilibrado')),30);
 v_transport:=pg_catalog.left(pg_catalog.btrim(coalesce(v_trip->>'transport','')),40);
 update public.community_trips
 set title=v_dest,destination=v_dest,days_count=v_count,pace=v_pace,
     transport=v_transport,content=v_content
 where source_trip_id=new.id and published=true;
 return new;
end;
$$;
revoke all on function private.viaja_sync_published_trip() from public,anon,authenticated;
drop trigger if exists viaja_sync_published_trip_trigger on public.trips;
create trigger viaja_sync_published_trip_trigger
after update of document on public.trips
for each row execute function private.viaja_sync_published_trip();

-- Public views of the shared catalogue can display the last sync timestamp.
grant select(updated_at) on public.community_trips to anon;
commit;