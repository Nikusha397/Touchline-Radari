-- Internal trigger helpers do not need Data API caller permissions.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
-- Explicitly deny direct client reads/writes of the private owner allowlist.
create policy no_client_access on touchline_private.admin_emails for all to authenticated using (false) with check (false);
