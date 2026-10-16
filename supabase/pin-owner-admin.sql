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
