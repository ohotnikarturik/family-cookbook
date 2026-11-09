-- W35.4: family-scoped member directory (display name + role only; no auth email).

create or replace function public.list_family_member_directory (p_family_id uuid)
returns table (
  user_id uuid,
  role public.family_role,
  status public.membership_status,
  display_name text
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  if not private.is_active_member (p_family_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
  select
    fm.user_id,
    fm.role,
    fm.status,
    nullif(btrim(p.display_name), '') as display_name
  from
    public.family_members fm
    inner join public.profiles p on p.user_id = fm.user_id
  where
    fm.family_id = p_family_id
  order by
    case fm.role
      when 'owner' then 1
      when 'admin' then 2
      when 'editor' then 3
      when 'contributor' then 4
      when 'viewer' then 5
    end,
    coalesce(nullif(btrim(p.display_name), ''), fm.user_id::text);
end;
$$;

comment on function public.list_family_member_directory (uuid) is
  'Active family members see co-member display names and roles. Never exposes auth email.';

revoke all on function public.list_family_member_directory (uuid)
from
  public;

grant
execute on function public.list_family_member_directory (uuid) to authenticated;
