create or replace function public.keepalive()
returns boolean
language sql
stable
as $$
  select true;
$$;

revoke all on function public.keepalive() from public;
grant execute on function public.keepalive() to anon, authenticated;
