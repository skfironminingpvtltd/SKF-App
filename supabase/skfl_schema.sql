-- =====================================================================================
-- SKF chat — the `skfl` table (v2: one JSON `content` column)
--
-- The table is now just:
--     id · message_type · content (jsonb) · created_at · updated_at
--
-- Everything else about a message — who sent it, the media, a poll / event / contact card, the
-- reply it quotes, the votes it received, "edited" / "deleted" — lives inside `content`.
-- Every key is ALWAYS present: a value that has no data is "" (or [] / 0 / false), so a row is easy
-- to read in the Supabase table editor and the app never has to guess whether a key exists.
--
-- message_type: text | image | audio | video | file | poll | event | contact
--
-- content (example: a poll with two votes):
--   {
--     "text": "",                                  -- message text, or the caption of a photo / file
--     "sender":   { "client_id": "anon_x", "badge": "Anon-5131", "avatar_color": "#F06292" },
--     "media":    { "file_name": "", "original_name": "", "file_size": "", "mime_type": "",
--                   "storage_path": "", "public_url": "", "width": "", "height": "", "duration_ms": "" },
--     "poll":     { "question": "We make trip ??", "options": ["Yes", "No"], "multi": false },
--     "event":    { "title": "", "starts_at": "", "location": "", "description": "" },
--     "contact":  { "name": "", "phones": [], "emails": [] },
--     "reply_to": { "id": "", "sender_badge": "", "sender_avatar_color": "", "text": "",
--                   "message_type": "", "media_url": "" },
--     "responses": {
--       "total": 2,                                -- how many people have responded
--       "results": [ { "choice": "0", "label": "Yes", "count": 1 },
--                    { "choice": "1", "label": "No",  "count": 1 } ],
--       "votes":   [ { "client_id": "anon_x", "choice": "0", "label": "Yes", "at": "2026-09-26T09:00:00.000Z" },
--                    { "client_id": "anon_y", "choice": "1", "label": "No",  "at": "2026-09-26T09:01:00.000Z" } ]
--     },
--     "edited_at": "",                             -- ISO time once the text was edited
--     "deleted_at": ""                             -- ISO time once it was deleted for everyone
--   }
--
-- Run once in the Supabase dashboard -> SQL Editor. Safe to re-run. If the table still has the old
-- columns (sender_badge, media_*, status …) they are folded into `content` first, then dropped.
-- =====================================================================================

-- ─── Helpers ─────────────────────────────────────────────────────────────────────────

-- A `content` object with every key present and empty
create or replace function public.skfl_empty_content()
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'text', '',
    'sender',    jsonb_build_object('client_id', '', 'badge', '', 'avatar_color', ''),
    'media',     jsonb_build_object('file_name', '', 'original_name', '', 'file_size', '', 'mime_type', '',
                                    'storage_path', '', 'public_url', '', 'width', '', 'height', '', 'duration_ms', ''),
    'poll',      jsonb_build_object('question', '', 'options', '[]'::jsonb, 'multi', false),
    'event',     jsonb_build_object('title', '', 'starts_at', '', 'location', '', 'description', ''),
    'contact',   jsonb_build_object('name', '', 'phones', '[]'::jsonb, 'emails', '[]'::jsonb),
    'reply_to',  jsonb_build_object('id', '', 'sender_badge', '', 'sender_avatar_color', '', 'text', '',
                                    'message_type', '', 'media_url', ''),
    'responses', jsonb_build_object('total', 0, 'results', '[]'::jsonb, 'votes', '[]'::jsonb),
    'edited_at', '',
    'deleted_at', ''
  );
$$;

-- The answers a message accepts: [{choice, label}], or null when it takes none.
-- Poll: one choice per option (choice = the option's position, "0", "1", …). Event: going / maybe / no.
create or replace function public.skfl_response_labels(p_type text, p_content jsonb)
returns jsonb
language sql
immutable
as $$
  select case p_type
    when 'poll' then (
      select jsonb_agg(jsonb_build_object('choice', (o.ord - 1)::text, 'label', o.val) order by o.ord)
        from jsonb_array_elements_text(coalesce(p_content -> 'poll' -> 'options', '[]'::jsonb)) with ordinality as o(val, ord)
    )
    when 'event' then
      '[{"choice":"going","label":"Going"},{"choice":"maybe","label":"Maybe"},{"choice":"no","label":"Can''t go"}]'::jsonb
  end;
$$;

-- UTC timestamp in the same ISO format the app writes
create or replace function public.skfl_now_iso()
returns text
language sql
stable
as $$
  select to_char(clock_timestamp() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
$$;

-- ─── Table ───────────────────────────────────────────────────────────────────────────

create table if not exists public.skfl (
  id           uuid        primary key default gen_random_uuid(),
  message_type text        not null default 'text',
  content      jsonb       not null default public.skfl_empty_content(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Old layout → new layout: fold the loose columns into `content`, then drop them
do $$
declare
  r    record;
  c    jsonb;
  t    text;
  txt  text;
  rich jsonb;
begin
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'skfl' and column_name = 'sender_badge'
  ) then
    return;
  end if;

  alter table public.skfl add column if not exists content_json jsonb;
  alter table public.skfl drop constraint if exists skfl_message_type_check; -- poll / event / contact are new types
  alter table public.skfl disable trigger user;                              -- keep every row's original updated_at

  for r in select * from public.skfl loop
    c    := public.skfl_empty_content();
    t    := r.message_type;
    txt  := coalesce(r.content, '');
    rich := null;

    -- Polls / events / contacts / replies used to be stored as 'SKF_RICH::' + JSON inside the text
    if txt like 'SKF_RICH::%' then
      begin
        rich := substr(txt, 11)::jsonb;
      exception when others then
        rich := null;
      end;
      txt := '';
    end if;

    if rich is not null then
      case rich ->> 'kind'
        when 'poll' then
          t := 'poll';
          c := jsonb_set(c, '{poll}', jsonb_build_object(
                 'question', coalesce(rich ->> 'question', ''),
                 'options',  coalesce(rich -> 'options', '[]'::jsonb),
                 'multi',    coalesce((rich ->> 'multi')::boolean, false)));
        when 'event' then
          t := 'event';
          c := jsonb_set(c, '{event}', jsonb_build_object(
                 'title',       coalesce(rich ->> 'title', ''),
                 'starts_at',   coalesce(rich ->> 'startsAt', ''),
                 'location',    coalesce(rich ->> 'location', ''),
                 'description', coalesce(rich ->> 'description', '')));
        when 'contact' then
          t := 'contact';
          c := jsonb_set(c, '{contact}', jsonb_build_object(
                 'name',   coalesce(rich ->> 'name', ''),
                 'phones', coalesce(rich -> 'phones', '[]'::jsonb),
                 'emails', coalesce(rich -> 'emails', '[]'::jsonb)));
        when 'reply' then
          txt := coalesce(rich ->> 'text', '');
          c := jsonb_set(c, '{reply_to}', jsonb_build_object(
                 'id',                  coalesce(rich #>> '{replyTo,id}', ''),
                 'sender_badge',        coalesce(rich #>> '{replyTo,sender_badge}', ''),
                 'sender_avatar_color', coalesce(rich #>> '{replyTo,sender_avatar_color}', ''),
                 'text',                coalesce(rich #>> '{replyTo,text}', ''),
                 'message_type',        coalesce(rich #>> '{replyTo,message_type}', ''),
                 'media_url',           coalesce(rich #>> '{replyTo,media_url}', '')));
        else
          null;
      end case;
    elsif t <> 'text' and txt <> '' and txt in (coalesce(r.media_file_name, ''), coalesce(r.media_original_name, '')) then
      txt := ''; -- the old app stored the file name as the "text" of a photo / file; that is not a caption
    end if;

    c := jsonb_set(c, '{text}', to_jsonb(txt));
    c := jsonb_set(c, '{sender}', jsonb_build_object(
           'client_id',    coalesce(r.sender_client_id, ''),
           'badge',        coalesce(r.sender_badge, ''),
           'avatar_color', coalesce(r.sender_avatar_color, '')));
    c := jsonb_set(c, '{media}', jsonb_build_object(
           'file_name',     coalesce(r.media_file_name, ''),
           'original_name', coalesce(r.media_original_name, ''),
           'file_size',     coalesce(to_jsonb(r.media_file_size), '""'::jsonb),
           'mime_type',     coalesce(r.media_mime_type, ''),
           'storage_path',  coalesce(r.media_storage_path, ''),
           'public_url',    coalesce(r.media_public_url, ''),
           'width',         coalesce(to_jsonb(r.media_width), '""'::jsonb),
           'height',        coalesce(to_jsonb(r.media_height), '""'::jsonb),
           'duration_ms',   coalesce(to_jsonb(r.media_duration_ms), '""'::jsonb)));

    -- optional columns from skfl_message_actions.sql, if it was ever run
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'skfl' and column_name = 'edited_at') then
      c := jsonb_set(c, '{edited_at}', to_jsonb(coalesce((to_jsonb(r) ->> 'edited_at'), '')));
      c := jsonb_set(c, '{deleted_at}', to_jsonb(coalesce((to_jsonb(r) ->> 'deleted_at'), '')));
    end if;

    update public.skfl set message_type = t, content_json = c where id = r.id;
  end loop;

  alter table public.skfl enable trigger user;
  alter table public.skfl drop constraint if exists skfl_status_check;
  alter table public.skfl
    drop column content,
    drop column sender_badge,
    drop column sender_avatar_color,
    drop column sender_client_id,
    drop column media_file_name,
    drop column media_original_name,
    drop column media_file_size,
    drop column media_mime_type,
    drop column media_storage_path,
    drop column media_public_url,
    drop column media_width,
    drop column media_height,
    drop column media_duration_ms,
    drop column status,
    drop column network_ssid,
    drop column network_ip,
    drop column if exists edited_at,
    drop column if exists deleted_at;
  alter table public.skfl rename column content_json to content;
  alter table public.skfl alter column content set not null;
  alter table public.skfl alter column content set default public.skfl_empty_content();
end $$;

alter table public.skfl drop constraint if exists skfl_message_type_check;
alter table public.skfl add  constraint skfl_message_type_check
  check (message_type in ('text', 'image', 'audio', 'video', 'file', 'poll', 'event', 'contact'));

alter table public.skfl drop constraint if exists skfl_content_is_object;
alter table public.skfl add  constraint skfl_content_is_object
  check (jsonb_typeof(content) = 'object');

create index if not exists skfl_created_at_idx on public.skfl (created_at);

-- ─── Triggers ────────────────────────────────────────────────────────────────────────

-- Whatever writes a row (the app, the SQL editor, the table editor) the content always ends up with
-- every key present: missing → "" ; a poll / event starts with a 0-count result per answer.
create or replace function public.skfl_normalize_content()
returns trigger
language plpgsql
as $$
declare
  base   jsonb := public.skfl_empty_content();
  given  jsonb := coalesce(jsonb_strip_nulls(new.content), '{}'::jsonb);
  merged jsonb := given;
  k      text;
  v      jsonb;
  labels jsonb;
begin
  for k, v in select key, value from jsonb_each(base) loop
    if jsonb_typeof(v) = 'object' and jsonb_typeof(given -> k) = 'object' then
      merged := merged || jsonb_build_object(k, v || (given -> k));
    elsif not (given ? k) then
      merged := merged || jsonb_build_object(k, v);
    end if;
  end loop;

  labels := public.skfl_response_labels(new.message_type, merged);
  if labels is not null and jsonb_array_length(coalesce(merged #> '{responses,results}', '[]'::jsonb)) = 0 then
    merged := jsonb_set(merged, '{responses,results}', (
      select jsonb_agg(jsonb_build_object('choice', l ->> 'choice', 'label', l ->> 'label', 'count', 0))
        from jsonb_array_elements(labels) l
    ));
  end if;

  new.content := merged;
  return new;
end;
$$;

drop trigger if exists skfl_normalize on public.skfl;
create trigger skfl_normalize
  before insert or update of content, message_type on public.skfl
  for each row execute function public.skfl_normalize_content();

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists skfl_updated_at on public.skfl;
create trigger skfl_updated_at
  before update on public.skfl
  for each row execute function public.update_updated_at_column();

-- Polls / events converted from the old layout start with their 0-count results filled in
update public.skfl
   set content = content
 where message_type in ('poll', 'event')
   and jsonb_array_length(coalesce(content #> '{responses,results}', '[]'::jsonb)) = 0;

-- ─── Access ──────────────────────────────────────────────────────────────────────────

alter table public.skfl enable row level security;

-- Same rule as the other chat SQL files: with master login installed (skfl_master_access.sql) that
-- file owns the policies; without it (the open setup) the app's anon key may read and add messages.
-- Edits, deletes and votes never touch the table directly — they go through the functions below.
do $$
begin
  if to_regprocedure('public.skfl_is_master()') is null then
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'skfl' and policyname = 'Allow public read all messages') then
      create policy "Allow public read all messages" on public.skfl for select using (true);
    end if;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'skfl' and policyname = 'Allow public insert messages') then
      create policy "Allow public insert messages" on public.skfl for insert with check (true);
    end if;
  end if;
end $$;

-- Table and function permissions
grant all on table public.skfl to anon, authenticated, service_role;
grant execute on function public.skfl_empty_content() to anon, authenticated;
grant execute on function public.skfl_response_labels(text, jsonb) to anon, authenticated;
grant execute on function public.skfl_now_iso() to anon, authenticated;
grant execute on function public.skfl_normalize_content() to anon, authenticated;
grant execute on function public.skfl_assert_access() to anon, authenticated;

-- Live updates: new messages, edits, deletes and every vote reach every phone at once
do $$
begin
  begin
    alter publication supabase_realtime add table public.skfl;
  exception when duplicate_object then null;
  end;
end $$;

-- With master login installed only the Master account may call the functions below
create or replace function public.skfl_assert_access()
returns void
language plpgsql
stable
as $$
declare
  ok boolean;
begin
  if to_regprocedure('public.skfl_is_master()') is not null then
    execute 'select public.skfl_is_master()' into ok;
    if not coalesce(ok, false) then
      raise exception 'not allowed' using errcode = '42501';
    end if;
  end if;
end;
$$;

-- ─── Actions (edit / delete for everyone / vote) ────────────────────────────────────

-- Edit the text of your own text message, within 10 minutes of sending it
create or replace function public.skfl_edit_message(p_id uuid, p_client_id text, p_text text)
returns public.skfl
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.skfl;
begin
  perform public.skfl_assert_access();

  select * into r from public.skfl where id = p_id for update;
  if not found then
    raise exception 'message not found' using errcode = 'P0002';
  end if;
  if coalesce(p_client_id, '') = '' or r.content -> 'sender' ->> 'client_id' is distinct from p_client_id then
    raise exception 'not your message' using errcode = '42501';
  end if;
  if r.message_type <> 'text' or coalesce(r.content ->> 'deleted_at', '') <> '' then
    raise exception 'this message cannot be edited' using errcode = '42501';
  end if;
  -- a message can only be edited for 10 minutes after it was sent
  if now() - r.created_at > interval '10 minutes' then
    raise exception 'edit time is over' using errcode = '42501';
  end if;

  update public.skfl
     set content = content || jsonb_build_object('text', coalesce(p_text, ''), 'edited_at', public.skfl_now_iso())
   where id = p_id
  returning * into r;
  return r;
end;
$$;

-- Delete your own message for everyone: the row stays (so every phone can show
-- "This message was deleted") but everything except the sender is wiped
create or replace function public.skfl_delete_message(p_id uuid, p_client_id text)
returns public.skfl
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.skfl;
begin
  perform public.skfl_assert_access();

  select * into r from public.skfl where id = p_id for update;
  if not found then
    raise exception 'message not found' using errcode = 'P0002';
  end if;
  if coalesce(p_client_id, '') = '' or r.content -> 'sender' ->> 'client_id' is distinct from p_client_id then
    raise exception 'not your message' using errcode = '42501';
  end if;

  update public.skfl
     set content = jsonb_set(public.skfl_empty_content(), '{sender}', r.content -> 'sender')
                   || jsonb_build_object('deleted_at', public.skfl_now_iso())
   where id = p_id
  returning * into r;
  return r;
end;
$$;

-- Vote in a poll / answer an event: choosing the same answer again withdraws it.
-- Single-answer polls and events keep one answer per person. Recounts everything inside `content`.
create or replace function public.skfl_cast_response(p_id uuid, p_client_id text, p_choice text)
returns public.skfl
language plpgsql
security definer
set search_path = public
as $$
declare
  r      public.skfl;
  c      jsonb;
  labels jsonb;
  multi  boolean;
  votes  jsonb;
  label  text;
begin
  perform public.skfl_assert_access();
  if coalesce(p_client_id, '') = '' then
    raise exception 'client id required' using errcode = '22023';
  end if;

  select * into r from public.skfl where id = p_id for update;
  if not found then
    raise exception 'message not found' using errcode = 'P0002';
  end if;
  c := r.content;
  if coalesce(c ->> 'deleted_at', '') <> '' then
    raise exception 'message was deleted' using errcode = '42501';
  end if;

  labels := public.skfl_response_labels(r.message_type, c);
  if labels is null then
    raise exception 'this message does not take responses' using errcode = '22023';
  end if;
  select l ->> 'label' into label from jsonb_array_elements(labels) l where l ->> 'choice' = p_choice;
  if label is null then
    raise exception 'unknown choice' using errcode = '22023';
  end if;
  multi := r.message_type = 'poll' and coalesce((c -> 'poll' ->> 'multi')::boolean, false);

  votes := coalesce(c -> 'responses' -> 'votes', '[]'::jsonb);

  if exists (select 1 from jsonb_array_elements(votes) v where v ->> 'client_id' = p_client_id and v ->> 'choice' = p_choice) then
    -- same answer again: withdraw it
    votes := coalesce((
      select jsonb_agg(v order by ord)
        from jsonb_array_elements(votes) with ordinality as x(v, ord)
       where not (v ->> 'client_id' = p_client_id and v ->> 'choice' = p_choice)
    ), '[]'::jsonb);
  else
    if not multi then
      -- single answer: replace this person's previous one
      votes := coalesce((
        select jsonb_agg(v order by ord)
          from jsonb_array_elements(votes) with ordinality as x(v, ord)
         where v ->> 'client_id' <> p_client_id
      ), '[]'::jsonb);
    end if;
    votes := votes || jsonb_build_array(jsonb_build_object(
      'client_id', p_client_id, 'choice', p_choice, 'label', label, 'at', public.skfl_now_iso()));
  end if;

  c := jsonb_set(c, '{responses}', jsonb_build_object(
    'total', (select count(distinct v ->> 'client_id') from jsonb_array_elements(votes) v),
    'results', (
      select jsonb_agg(jsonb_build_object(
               'choice', l ->> 'choice',
               'label',  l ->> 'label',
               'count',  (select count(*) from jsonb_array_elements(votes) v where v ->> 'choice' = l ->> 'choice'))
             order by ord)
        from jsonb_array_elements(labels) with ordinality as y(l, ord)
    ),
    'votes', votes
  ));

  update public.skfl set content = c where id = p_id returning * into r;
  return r;
end;
$$;

revoke all on function public.skfl_edit_message(uuid, text, text)    from public;
revoke all on function public.skfl_delete_message(uuid, text)        from public;
revoke all on function public.skfl_cast_response(uuid, text, text)   from public;
grant execute on function public.skfl_edit_message(uuid, text, text)  to anon, authenticated;
grant execute on function public.skfl_delete_message(uuid, text)      to anon, authenticated;
grant execute on function public.skfl_cast_response(uuid, text, text) to anon, authenticated;

-- Pin the search path of the helper functions
alter function public.skfl_empty_content()                 set search_path = public;
alter function public.skfl_response_labels(text, jsonb)    set search_path = public;
alter function public.skfl_now_iso()                       set search_path = public;
alter function public.skfl_normalize_content()             set search_path = public;
alter function public.skfl_assert_access()                 set search_path = public;
alter function public.update_updated_at_column()           set search_path = public;
