begin;
alter table public.player_profiles
  add column if not exists city_id text,
  add column if not exists area_id text,
  add column if not exists phone text,
  add column if not exists avatar_url text;
alter table public.hub_owner_profiles
  add column if not exists city_id text,
  add column if not exists area_id text;
-- Preserve existing addresses. Owners choose an exact area on their next edit.
update public.hub_owner_profiles set city_id='lahore' where city_id is null and location ilike '%lahore%';
update public.player_profiles set city_id='lahore' where city_id is null and primary_location ilike '%lahore%';
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('profile-photos','profile-photos',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do nothing;
-- Uploads go through the authenticated backend; no public write policies.
notify pgrst,'reload schema';
commit;
