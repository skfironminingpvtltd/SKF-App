-- SKF chat: read receipts (blue ticks)
-- Run once in the Supabase dashboard -> SQL Editor. Safe to re-run, and safe to run before or
-- after skfl_master_access.sql (see SETUP.md for the recommended order).

-- Every device that has opened the chat
create table if not exists public.skfl_members (
  client_id  text primary key,
  first_seen timestamptz not null default now()
);

-- One row per (message, reader) once that reader has seen the message.
-- Rows disappear automatically when messages are cleared.
create table if not exists public.skfl_reads (
  message_id       uuid not null references public.skfl(id) on delete cascade,
  reader_client_id text not null,
  read_at          timestamptz not null default now(),
  primary key (message_id, reader_client_id)
);

create index if not exists skfl_reads_message_idx on public.skfl_reads (message_id);

alter table public.skfl_members enable row level security;
alter table public.skfl_reads   enable row level security;

-- Access policies
--   * With master login installed (skfl_master_access.sql), that file locks these tables to the
--     Master account, so this file creates NO policies and cannot re-open anything to anon.
--   * Without it (the old open setup), the app's anon key needs select/insert.
do $$
begin
  if to_regprocedure('public.skfl_is_master()') is null then
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'skfl_members' and policyname = 'skfl_members anon select') then
      create policy "skfl_members anon select" on public.skfl_members for select to anon using (true);
    end if;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'skfl_members' and policyname = 'skfl_members anon insert') then
      create policy "skfl_members anon insert" on public.skfl_members for insert to anon with check (true);
    end if;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'skfl_reads' and policyname = 'skfl_reads anon select') then
      create policy "skfl_reads anon select" on public.skfl_reads for select to anon using (true);
    end if;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'skfl_reads' and policyname = 'skfl_reads anon insert') then
      create policy "skfl_reads anon insert" on public.skfl_reads for insert to anon with check (true);
    end if;
  end if;
end $$;

grant all on table public.skfl_members to anon, authenticated, service_role;
grant all on table public.skfl_reads to anon, authenticated, service_role;

-- Live blue-tick updates
do $$
begin
  begin
    alter publication supabase_realtime add table public.skfl_reads;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.skfl_members;
  exception when duplicate_object then null;
  end;
end $$;
