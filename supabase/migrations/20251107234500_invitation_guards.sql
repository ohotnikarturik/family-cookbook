-- T1.5 follow-up: invitation rows are sealed after insert.
-- Authenticated updates may only revoke a pending invite.
-- Membership inserts from authenticated users are limited to family bootstrap.
-- Redemption requires a confirmed email and runs only through accept_family_invitation.

create or replace function private.family_invitations_guard_update ()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if old.accepted_at is not null or old.revoked_at is not null then
    raise exception 'invitation cannot be changed' using errcode = '42501';
  end if;

  if new.id is distinct from old.id
    or new.family_id is distinct from old.family_id
    or new.email_normalized is distinct from old.email_normalized
    or new.role is distinct from old.role
    or new.token_hash is distinct from old.token_hash
    or new.invited_by is distinct from old.invited_by
    or new.expires_at is distinct from old.expires_at
    or new.created_at is distinct from old.created_at
  then
    raise exception 'invitation cannot be changed' using errcode = '42501';
  end if;

  if new.revoked_at is not null
    and new.accepted_at is not distinct from old.accepted_at
    and new.accepted_by is not distinct from old.accepted_by
  then
    return new;
  end if;

  -- Set only by accept_family_invitation in the same transaction.
  if current_setting('family_cookbook.invitation_redeem', true) = '1'
    and new.revoked_at is null
    and old.accepted_at is null
    and new.accepted_at is not null
    and old.accepted_by is null
    and new.accepted_by is not null
  then
    return new;
  end if;

  raise exception 'invitation cannot be changed' using errcode = '42501';
end;
$$;

comment on function private.family_invitations_guard_update () is
  'Allows pending-invite revoke, or the redemption update from accept_family_invitation.';

revoke all on function private.family_invitations_guard_update () from public;
grant execute on function private.family_invitations_guard_update () to authenticated;

create trigger family_invitations_guard_update
before update on public.family_invitations
for each row
execute function private.family_invitations_guard_update ();

drop policy "family_invitations_update_managers" on public.family_invitations;

create policy "family_invitations_update_revoke"
  on public.family_invitations
  for update
  to authenticated
  using (
    private.can_manage_memberships (family_id)
    and accepted_at is null
    and revoked_at is null
  )
  with check (
    private.can_manage_memberships (family_id)
    and accepted_at is null
    and accepted_by is null
    and revoked_at is not null
    and role = (
      select i.role
      from public.family_invitations i
      where i.id = family_invitations.id
    )
    and email_normalized = (
      select i.email_normalized
      from public.family_invitations i
      where i.id = family_invitations.id
    )
    and token_hash = (
      select i.token_hash
      from public.family_invitations i
      where i.id = family_invitations.id
    )
    and family_id = (
      select i.family_id
      from public.family_invitations i
      where i.id = family_invitations.id
    )
    and invited_by = (
      select i.invited_by
      from public.family_invitations i
      where i.id = family_invitations.id
    )
    and expires_at = (
      select i.expires_at
      from public.family_invitations i
      where i.id = family_invitations.id
    )
    and created_at = (
      select i.created_at
      from public.family_invitations i
      where i.id = family_invitations.id
    )
  );

drop policy "family_members_insert" on public.family_members;

create policy "family_members_insert_bootstrap"
  on public.family_members
  for insert
  to authenticated
  with check (
    user_id = auth.uid ()
    and role = 'owner'
    and status = 'active'
    and private.is_family_creator (family_id)
    and not private.family_has_members (family_id)
  );

comment on policy "family_members_insert_bootstrap" on public.family_members is
  'Authenticated insert is only the creator bootstrap. Later members join through accept_family_invitation.';

create or replace function public.accept_family_invitation (p_token text)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, auth, extensions
as $$
declare
  v_uid uuid;
  v_email text;
  v_hash text;
  v_invite public.family_invitations%rowtype;
begin
  v_uid := auth.uid ();
  if v_uid is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if p_token is null or char_length(btrim(p_token)) < 16 or char_length(p_token) > 256 then
    raise exception 'invalid invitation token' using errcode = '22023';
  end if;

  v_hash := encode(extensions.digest(btrim(p_token), 'sha256'), 'hex');

  select *
  into v_invite
  from public.family_invitations fi
  where fi.token_hash = v_hash
  for update;

  if not found then
    raise exception 'invitation not found' using errcode = 'P0002';
  end if;

  if v_invite.revoked_at is not null then
    raise exception 'invitation revoked' using errcode = '23503';
  end if;

  if v_invite.accepted_at is not null then
    raise exception 'invitation already accepted' using errcode = '23505';
  end if;

  if v_invite.expires_at <= now() then
    raise exception 'invitation expired' using errcode = '22023';
  end if;

  select lower(u.email)
  into v_email
  from auth.users u
  where u.id = v_uid
    and u.email_confirmed_at is not null;

  if v_email is null then
    raise exception 'verified email required' using errcode = '42501';
  end if;

  if v_email <> v_invite.email_normalized then
    raise exception 'email does not match invitation' using errcode = '42501';
  end if;

  if exists (
    select 1
    from public.family_members fm
    where fm.family_id = v_invite.family_id
      and fm.user_id = v_uid
      and fm.status = 'active'
  ) then
    raise exception 'already a member' using errcode = '23505';
  end if;

  insert into public.family_members (family_id, user_id, role, status)
  values (v_invite.family_id, v_uid, v_invite.role, 'active');

  perform set_config('family_cookbook.invitation_redeem', '1', true);

  update public.family_invitations
  set
    accepted_at = now(),
    accepted_by = v_uid
  where id = v_invite.id;

  return v_invite.family_id;
end;
$$;

comment on function public.accept_family_invitation (text) is
  'Redeems a single-use invitation after confirmed-email match; creates membership atomically.';

revoke all on function public.accept_family_invitation (text) from public;
grant execute on function public.accept_family_invitation (text) to authenticated;
