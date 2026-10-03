-- =====================================================================================
-- SKF chat — changing the Master password signs every phone out
--
-- Supabase keeps a phone signed in after the password is changed. This makes the change take effect:
-- the moment the password of ANY account changes (Dashboard → Authentication → Users → Reset password,
-- or the API), all of that account's sessions are deleted. Every phone's next start-up check (which runs
-- while the SKF loading screen plays) then fails and the app opens on the login page instead of the chat.
-- A phone that is open right now is signed out within about a minute of being used / resumed.
--
-- Safe to re-run.
-- =====================================================================================

create or replace function public.skfl_revoke_sessions_on_password_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from auth.sessions where user_id = new.id; -- refresh tokens go with their sessions
  return new;
end;
$$;

revoke all on function public.skfl_revoke_sessions_on_password_change() from public, anon, authenticated;

drop trigger if exists skfl_password_changed on auth.users;
create trigger skfl_password_changed
  after update of encrypted_password on auth.users
  for each row
  when (old.encrypted_password is distinct from new.encrypted_password)
  execute function public.skfl_revoke_sessions_on_password_change();
