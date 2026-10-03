-- =====================================================================================
-- SKF chat — PUSH NOTIFICATIONS
--
-- Every new message is pushed to every OTHER registered phone — even when the app is closed —
-- the way WhatsApp does it:
--     title: "SKF Iron & Mining Pvt Ltd Team"        body: "Anonymous: see you at the plant at 6"
--     photos / voice notes / files show as "📷 Photo", "🎤 Voice message", "📄 report.pdf"
--     (the sender is "Anonymous", the same as in the chat — nobody's badge is revealed)
--
-- How: each phone registers its Expo push token (via skfl_register_push_token below). A trigger on
-- the skfl table calls Expo's push service through pg_net, so there is nothing to host or deploy.
--
-- Run AFTER skfl_schema.sql. Works with or without skfl_master_access.sql: once that file is
-- installed, only the Master account can register a phone. Safe to re-run.
-- =====================================================================================

create extension if not exists pg_net;

-- One row per phone. RLS is on with NO policies, so nobody can read or edit tokens directly;
-- phones only go through the two functions below.
create table if not exists public.skfl_push_tokens (
  token       text primary key,
  client_id   text not null,
  platform    text,
  updated_at  timestamptz not null default now()
);
alter table public.skfl_push_tokens enable row level security;

create or replace function public.skfl_register_push_token(p_token text, p_client_id text, p_platform text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.skfl_assert_access();
  insert into public.skfl_push_tokens (token, client_id, platform, updated_at)
  values (p_token, p_client_id, p_platform, now())
  on conflict (token) do update
    set client_id = excluded.client_id, platform = excluded.platform, updated_at = now();
  -- phones refresh their token on every launch; drop ones that haven't been seen in 90 days
  delete from public.skfl_push_tokens where updated_at < now() - interval '90 days';
end;
$$;

create or replace function public.skfl_unregister_push_token(p_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.skfl_assert_access();
  delete from public.skfl_push_tokens where token = p_token;
end;
$$;

revoke all on function public.skfl_register_push_token(text, text, text) from public, anon;
revoke all on function public.skfl_unregister_push_token(text) from public, anon;
grant execute on function public.skfl_register_push_token(text, text, text) to authenticated;
grant execute on function public.skfl_unregister_push_token(text) to authenticated;

-- New message → push to everyone except the sender's own phone
create or replace function public.skfl_push_on_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  c        jsonb := new.content;
  preview  text;
  badge    text := coalesce(nullif(c -> 'sender' ->> 'badge', ''), 'Anonymous');
  photo    text := case when new.message_type = 'image' then nullif(c -> 'media' ->> 'public_url', '') end;
  batch    jsonb;
begin
  if badge in ('System', 'System Bot') or coalesce(c ->> 'deleted_at', '') <> '' then
    return new;
  end if;

  -- One line per kind of message, the way WhatsApp shows it
  preview := case new.message_type
    when 'poll'    then '📊 Poll: '    || left(coalesce(c -> 'poll' ->> 'question', ''), 100)
    when 'event'   then '📅 Event: '   || left(coalesce(c -> 'event' ->> 'title', ''), 100)
    when 'contact' then '👤 Contact: ' || left(coalesce(c -> 'contact' ->> 'name', ''), 100)
    when 'image'   then '📷 Photo'
    when 'video'   then '🎬 Video'
    when 'audio'   then '🎤 Voice message'
    when 'file'    then '📄 ' || coalesce(nullif(c -> 'media' ->> 'original_name', ''), 'Document')
    else left(coalesce(nullif(btrim(c ->> 'text'), ''), 'New message'), 140)
  end;

  -- Expo accepts up to 100 notifications per request, so send in batches of 100 phones
  for batch in
    select jsonb_agg(jsonb_build_object(
             'to',        t.token,
             'title',     'SKF Iron & Mining Pvt Ltd Team',
             'body',      'Anonymous: ' || preview,
             'sound',     'default',
             'channelId', 'messages',
             'priority',  'high',
             'ttl',       86400,
             'data',      jsonb_build_object('messageId', new.id, 'type', new.message_type)
           ) || case when photo is null then '{}'::jsonb else jsonb_build_object('richContent', jsonb_build_object('image', photo)) end)
      from (
        select token, (row_number() over (order by token) - 1) / 100 as grp
          from public.skfl_push_tokens
         where client_id is distinct from (c -> 'sender' ->> 'client_id')
      ) t
     group by t.grp
  loop
    perform net.http_post(
      url     := 'https://exp.host/--/api/v2/push/send',
      body    := batch,
      headers := jsonb_build_object('Content-Type', 'application/json', 'Accept', 'application/json')
    );
  end loop;

  return new;
exception when others then
  -- A notification problem must never stop a message from being saved
  raise warning 'skfl_push_on_message failed: %', sqlerrm;
  return new;
end;
$$;

drop trigger if exists skfl_push_after_insert on public.skfl;
create trigger skfl_push_after_insert
  after insert on public.skfl
  for each row execute function public.skfl_push_on_message();
