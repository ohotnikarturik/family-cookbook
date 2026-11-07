-- T1.4: atomic family bootstrap RPC and last-selected family preference on profiles.

-- ---------------------------------------------------------------------------
-- Profile preference (UX only; not authorization)
-- ---------------------------------------------------------------------------

alter table public.profiles
add column last_selected_family_id uuid null references public.families (id) on delete set null;

comment on column public.profiles.last_selected_family_id is
  'UI preference for last active family workspace; never used for authorization.';

create or replace function private.sanitize_last_selected_family ()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.last_selected_family_id is not null then
    if not exists (
      select
        1
      from
        public.family_members fm
      where
        fm.family_id = new.last_selected_family_id
        and fm.user_id = new.user_id
        and fm.status = 'active'
    ) then
      new.last_selected_family_id := null;
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.sanitize_last_selected_family () from public;

create trigger profiles_sanitize_last_selected_family
before insert
or update of last_selected_family_id on public.profiles for each row
execute function private.sanitize_last_selected_family ();

-- ---------------------------------------------------------------------------
-- Transactional family bootstrap (creator becomes sole owner)
-- ---------------------------------------------------------------------------

create or replace function public.create_family_bootstrap (
  p_name text,
  p_default_language text default 'en'
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_uid uuid;
  v_family_id uuid;
  v_name text;
begin
  v_uid := auth.uid ();
  if v_uid is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  v_name := btrim(p_name);
  if char_length(v_name) < 1 or char_length(v_name) > 120 then
    raise exception 'family name length must be between 1 and 120' using errcode = '22023';
  end if;

  if p_default_language not in ('en', 'fi', 'ru', 'uk') then
    raise exception 'unsupported default language' using errcode = '22023';
  end if;

  insert into public.families (name, default_language, created_by)
  values (v_name, p_default_language, v_uid)
  returning id into v_family_id;

  insert into public.family_members (family_id, user_id, role, status)
  values (v_family_id, v_uid, 'owner', 'active');

  return v_family_id;
end;
$$;

comment on function public.create_family_bootstrap (text, text) is
  'Creates a family and the caller''s sole owner membership in one transaction.';

revoke all on function public.create_family_bootstrap (text, text) from public;
grant execute on function public.create_family_bootstrap (text, text) to authenticated;
