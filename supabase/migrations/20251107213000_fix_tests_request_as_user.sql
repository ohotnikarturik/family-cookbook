-- tests.request_as_user cannot SET ROLE inside SECURITY DEFINER (Postgres restriction).

create or replace function tests.request_as_user (p_user_id uuid)
returns void
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if current_user not in ('postgres', 'supabase_admin') then
    raise exception 'tests.request_as_user is for local pgTAP only';
  end if;

  perform set_config('role', 'authenticated', true);
  perform set_config(
    'request.jwt.claims',
    json_build_object(
      'sub',
      p_user_id::text,
      'role',
      'authenticated',
      'aal',
      'aal1'
    )::text,
    true
  );
  perform set_config('request.jwt.claim.sub', p_user_id::text, true);
end;
$$;

revoke all on function tests.request_as_user (uuid) from public;
revoke all on function tests.request_as_user (uuid) from anon, authenticated;
