-- Schema-only export inspected for the TOUCHLINE Radar handover.
-- No auth users, sessions, passwords or owner allowlist rows are included.
-- Apply only to a reviewed target Supabase project, never blindly to production.
CREATE SCHEMA IF NOT EXISTS touchline_private;
CREATE TABLE IF NOT EXISTS touchline_private.admin_emails (email text PRIMARY KEY);
CREATE TABLE IF NOT EXISTS touchline_private.admin_users (user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE touchline_private.admin_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE touchline_private.admin_users ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON SCHEMA touchline_private FROM PUBLIC,anon;
GRANT USAGE ON SCHEMA touchline_private TO authenticated;
REVOKE ALL ON touchline_private.admin_emails,touchline_private.admin_users FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION touchline_private.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (
    select 1 from auth.users u
    join touchline_private.admin_users a on a.user_id=u.id
    where u.id=auth.uid() and u.deleted_at is null
      and lower(u.email)='bridgefmanagement@gmail.com'
      and exists (select 1 from auth.sessions s where s.user_id=u.id and s.id::text=auth.jwt()->>'session_id')
  );
$function$

CREATE OR REPLACE FUNCTION touchline_private.accounts(p_search text DEFAULT ''::text, p_page integer DEFAULT 1)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare result jsonb; term text := lower(left(coalesce(p_search,''),128));
begin
  if not touchline_private.is_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
  select jsonb_build_object(
    'registeredTotal',(select count(*) from auth.users where deleted_at is null and email is not null),
    'confirmedTotal',(select count(*) from auth.users where deleted_at is null and email_confirmed_at is not null),
    'recentTotal',(select count(*) from auth.users where deleted_at is null and email is not null and created_at >= now()-interval '7 days'),
    'total',(select count(*) from auth.users where deleted_at is null and email is not null and (term='' or position(term in lower(email||' '||coalesce(raw_user_meta_data->>'full_name','')))>0)),
    'accounts',coalesce((select jsonb_agg(to_jsonb(a)) from (
      select id,email,left(coalesce(raw_user_meta_data->>'full_name',''),80) as name,created_at,email_confirmed_at,last_sign_in_at
      from auth.users where deleted_at is null and email is not null
        and (term='' or position(term in lower(email||' '||coalesce(raw_user_meta_data->>'full_name','')))>0)
      order by created_at desc,id limit 25 offset ((greatest(1,least(coalesce(p_page,1),100000))-1)*25)
    ) a),'[]'::jsonb)
  ) into result;
  return result;
end;
$function$

CREATE OR REPLACE FUNCTION public.touchline_is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$ select touchline_private.is_admin(); $function$

CREATE OR REPLACE FUNCTION public.touchline_admin_accounts(p_search text DEFAULT ''::text, p_page integer DEFAULT 1)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$ select touchline_private.accounts(p_search,p_page); $function$

REVOKE ALL ON FUNCTION touchline_private.is_admin(),touchline_private.accounts(text,integer),public.touchline_is_admin(),public.touchline_admin_accounts(text,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION touchline_private.is_admin(),touchline_private.accounts(text,integer),public.touchline_is_admin(),public.touchline_admin_accounts(text,integer) TO authenticated;
-- Enroll the intended, verified owner UUID separately. Do not use user_metadata as authorization.

