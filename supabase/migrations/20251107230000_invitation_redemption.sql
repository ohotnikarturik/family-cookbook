-- T1.5: pending-invite uniqueness and atomic invitation redemption.

create unique index family_invitations_pending_email_family_uidx on public.family_invitations (family_id, email_normalized)
where
  accepted_at is null
  and revoked_at is null;

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

  select
    *
  into
    v_invite
  from
    public.family_invitations fi
  where
    fi.token_hash = v_hash
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

  select
    lower(u.email)
  into
    v_email
  from
    auth.users u
  where
    u.id = v_uid;

  if v_email is null then
    raise exception 'verified email required' using errcode = '42501';
  end if;

  if v_email <> v_invite.email_normalized then
    raise exception 'email does not match invitation' using errcode = '42501';
  end if;

  if exists (
    select
      1
    from
      public.family_members fm
    where
      fm.family_id = v_invite.family_id
      and fm.user_id = v_uid
      and fm.status = 'active'
  ) then
    raise exception 'already a member' using errcode = '23505';
  end if;

  insert into public.family_members (family_id, user_id, role, status)
  values (v_invite.family_id, v_uid, v_invite.role, 'active');

  update public.family_invitations
  set
    accepted_at = now(),
    accepted_by = v_uid
  where
    id = v_invite.id;

  return v_invite.family_id;
end;
$$;

comment on function public.accept_family_invitation (text) is
  'Redeems a single-use family invitation after verified email match; creates membership atomically.';

revoke all on function public.accept_family_invitation (text) from public;
grant execute on function public.accept_family_invitation (text) to authenticated;
