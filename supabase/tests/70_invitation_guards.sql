begin;

select plan (7);

reset role;

insert into public.family_invitations (
  family_id,
  email_normalized,
  role,
  token_hash,
  invited_by,
  expires_at
)
values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
  'guard-invite@family-cookbook.test',
  'viewer',
  encode(extensions.digest('guard-invite-token-32chars-min!', 'sha256'), 'hex'),
  '11111111-1111-4111-8111-111111111101'::uuid,
  now() + interval '7 days'
);

select tests.request_as_user ('11111111-1111-4111-8111-111111111104');

select
  throws_ok (
    $$
      update public.family_invitations
      set role = 'admin'
      where email_normalized = 'guard-invite@family-cookbook.test'
    $$,
    '42501',
    'invitation cannot be changed',
    'admin cannot rewrite an invitation role'
  );

select
  throws_ok (
    $$
      update public.family_invitations
      set email_normalized = 'admin-a@family-cookbook.test'
      where email_normalized = 'guard-invite@family-cookbook.test'
    $$,
    '42501',
    'invitation cannot be changed',
    'admin cannot rewrite an invitation email'
  );

select
  throws_ok (
    $$
      update public.family_invitations
      set token_hash = encode(extensions.digest('attacker-chosen-token-32chars!!', 'sha256'), 'hex')
      where email_normalized = 'guard-invite@family-cookbook.test'
    $$,
    '42501',
    'invitation cannot be changed',
    'admin cannot rewrite an invitation token hash'
  );

select
  throws_ok (
    $$
      insert into public.family_members (family_id, user_id, role, status)
      values (
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
        '22222222-2222-4222-8222-222222222202'::uuid,
        'contributor',
        'active'
      )
    $$,
    '42501',
    null,
    'admin cannot add a member without accepting an invitation'
  );

reset role;

select tests.request_as_user ('11111111-1111-4111-8111-111111111101');

select
  lives_ok (
    $$
      update public.family_invitations
      set revoked_at = now()
      where email_normalized = 'guard-invite@family-cookbook.test'
    $$,
    'owner can revoke a pending invitation'
  );

select
  results_eq (
    $$
      select role::text, revoked_at is not null
      from public.family_invitations
      where email_normalized = 'guard-invite@family-cookbook.test'
    $$,
    $$ values ('viewer'::text, true) $$,
    'revoke keeps the invited role and sets revoked_at'
  );

reset role;

update auth.users
set email_confirmed_at = null
where id = '22222222-2222-4222-8222-222222222201'::uuid;

insert into public.family_invitations (
  family_id,
  email_normalized,
  role,
  token_hash,
  invited_by,
  expires_at
)
values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
  'owner-b@family-cookbook.test',
  'viewer',
  encode(extensions.digest('unconfirmed-token-32chars-min!!', 'sha256'), 'hex'),
  '11111111-1111-4111-8111-111111111101'::uuid,
  now() + interval '7 days'
);

select tests.request_as_user ('22222222-2222-4222-8222-222222222201');

select
  throws_ok (
    $$ select public.accept_family_invitation('unconfirmed-token-32chars-min!!') $$,
    '42501',
    'verified email required',
    'unconfirmed email cannot redeem an invitation'
  );

select * from finish ();

rollback;
