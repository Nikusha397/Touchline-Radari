-- Pin the previously verified owner account. Unverified new signups cannot
-- inherit administrative access by selecting or later changing an email.
create table if not exists touchline_private.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table touchline_private.admin_users enable row level security;
revoke all on touchline_private.admin_users from public, anon, authenticated;
do $$ begin
  if not exists(select 1 from pg_policies where schemaname='touchline_private' and tablename='admin_users' and policyname='no_client_admin_registry') then
    create policy no_client_admin_registry on touchline_private.admin_users for all to anon, authenticated using(false) with check(false);
  end if;
end $$;
insert into touchline_private.admin_users(user_id)
select id from auth.users
where lower(email)='bridgefmanagement@gmail.com'
  and email_confirmed_at < timestamptz '2026-10-14 00:00:00+00'
  and created_at < timestamptz '2026-10-14 00:00:00+00'
  and deleted_at is null
on conflict do nothing;

create or replace function touchline_private.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from auth.users u
    join touchline_private.admin_users a on a.user_id=u.id
    where u.id=auth.uid() and u.deleted_at is null
      and lower(u.email)='bridgefmanagement@gmail.com'
      and exists (select 1 from auth.sessions s where s.user_id=u.id and s.id::text=auth.jwt()->>'session_id')
  );
$$;
revoke all on function touchline_private.is_admin() from public, anon;
grant execute on function touchline_private.is_admin() to authenticated;

create or replace function touchline_private.accounts(p_search text default '', p_page integer default 1)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
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
$$;
revoke all on function touchline_private.accounts(text,integer) from public, anon;
grant execute on function touchline_private.accounts(text,integer) to authenticated;

-- Only bounded RPC wrappers are exposed to the Data API.
create or replace function public.touchline_is_admin()
returns boolean language sql stable security invoker set search_path = '' as $$ select touchline_private.is_admin(); $$;
revoke all on function public.touchline_is_admin() from public, anon;
grant execute on function public.touchline_is_admin() to authenticated;
create or replace function public.touchline_admin_accounts(p_search text default '',p_page integer default 1)
returns jsonb language sql stable security invoker set search_path = '' as $$ select touchline_private.accounts(p_search,p_page); $$;
revoke all on function public.touchline_admin_accounts(text,integer) from public, anon;
grant execute on function public.touchline_admin_accounts(text,integer) to authenticated;
