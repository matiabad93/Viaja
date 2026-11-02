-- The public catalogue filters explicitly on published=true.
-- Column-level SELECT privilege must include every column used in WHERE.
-- Other private columns (user_id, source_trip_id) remain inaccessible to anon.
begin;
grant select (published) on public.community_trips to anon;
commit;
