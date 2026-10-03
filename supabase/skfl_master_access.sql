-- =====================================================================================
-- SKF chat — MASTER LOGIN ACCESS (replaces the old local-WiFi restriction)
--
-- What this does
--   Only the signed-in Master account can read or write the chat. Anyone who gets a copy of the
--   app but does not know the shared email + password sees the login screen and nothing else —
--   and cannot read the data by talking to Supabase directly either.
--
-- Run ORDER (see supabase/SETUP.md):
--   1. Supabase → Authentication → Users → Add user  (email + password, tick "Auto Confirm User")
--   2. Put that same email in master_email below
--   3. Run skfl_schema.sql first, then skfl_read_receipts.sql if you want blue ticks (this file must
--      run AFTER them so those tables are locked too). The edit / delete / vote functions in
--      skfl_schema.sql check for the Master account themselves, so nothing more is needed for them.
--   4. Run THIS file once in the SQL Editor
--
-- Safe to re-run. If the master user does not exist yet it stops with an error BEFORE changing
-- anything, so you can't lock yourself out by mistake.
-- =====================================================================================

do $$
declare
  master_email constant text := 'skflmessage@gmail.com';   -- ← The shared email created in Authentication → Users
  n int;
begin
  -- The "skfl_master" flag lives in app_metadata, which only the server can set — a person who
  -- signs up on their own can never give themselves this flag.
  update auth.users
     set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"skfl_master": true}'::jsonb
   where lower(email) = lower(master_email);
  get diagnostics n = row_count;
  if n = 0 then
    raise exception 'Master user "%" not found. Create it first: Authentication → Users → Add user.', master_email;
  end if;
end $$;

-- True only for a signed-in session that belongs to the Master account
create or replace function public.skfl_is_master()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'skfl_master')::boolean, false);
$$;
grant execute on function public.skfl_is_master() to authenticated;
grant execute on all functions in schema public to authenticated;

-- Lock every chat table: drop the old open policies, allow only the Master account
do $$
declare
  t text;
  p record;
begin
  foreach t in array array['skfl', 'skfl_members', 'skfl_reads'] loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table public.%I enable row level security', t);
      execute format('grant all on table public.%I to authenticated', t);
      for p in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
        execute format('drop policy %I on public.%I', p.policyname, t);
      end loop;
      execute format(
        'create policy %I on public.%I for all to authenticated using ((select public.skfl_is_master())) with check ((select public.skfl_is_master()))',
        t || '_master_only', t
      );
    end if;
  end loop;
end $$;

-- Lock the media bucket the same way
do $$
declare
  p record;
begin
  for p in
    select policyname from pg_policies
     where schemaname = 'storage' and tablename = 'objects'
       and (coalesce(qual, '') ilike '%skfl-media%' or coalesce(with_check, '') ilike '%skfl-media%')
  loop
    execute format('drop policy %I on storage.objects', p.policyname);
  end loop;
end $$;

drop policy if exists skfl_media_master_only on storage.objects;
create policy skfl_media_master_only on storage.objects
  for all to authenticated
  using (bucket_id = 'skfl-media' and (select public.skfl_is_master()))
  with check (bucket_id = 'skfl-media' and (select public.skfl_is_master()));

-- Live updates: make sure every chat table is published to Realtime, so a new / edited / deleted
-- row (from any phone, or straight in the Supabase table editor) shows on every phone at once.
-- Realtime applies the policies above, so only signed-in Master sessions receive the events.
do $$
declare
  t text;
begin
  foreach t in array array['skfl', 'skfl_members', 'skfl_reads'] loop
    if to_regclass('public.' || t) is not null
       and not exists (
         select 1 from pg_publication_tables
          where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
       ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- -------------------------------------------------------------------------------------
-- Handy later (run separately when needed):
--
--   Change the Master password:   Authentication → Users → (the user) → Reset password
--
--   Sign EVERY phone out at once (e.g. a phone was lost, or the password leaked):
--     delete from auth.sessions;
--   then change the password. Phones return to the login screen within about a minute.
-- -------------------------------------------------------------------------------------
