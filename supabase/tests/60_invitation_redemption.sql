begin;

select plan (8);

-- Shared token for Family A invite to Contributor B (not yet in A).
\set redeem_token '''redeem-test-token-32chars-min!!'''

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
  'contributor-b@family-cookbook.test',
  'contributor',
  encode(extensions.digest('redeem-test-token-32chars-min!!', 'sha256'), 'hex'),
  '11111111-1111-4111-8111-111111111101'::uuid,
  now() + interval '7 days'
);

select tests.request_as_user ('22222222-2222-4222-8222-222222222202');

select
  results_eq (
    $$ select public.accept_family_invitation('redeem-test-token-32chars-min!!')::text $$,
    array['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::text],
    'matching user redeems invitation and receives family id'
  );

select
  results_eq (
    $$
      select count(*)::bigint
      from public.family_members
      where family_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
        and user_id = '22222222-2222-4222-8222-222222222202'::uuid
        and status = 'active'
    $$,
    array[1::bigint],
    'membership row is created on redeem'
  );

select
  results_eq (
    $$
      select role::text
      from public.family_members
      where family_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
        and user_id = '22222222-2222-4222-8222-222222222202'::uuid
    $$,
    array['contributor'::text],
    'redeemed membership uses the invited role'
  );

select
  throws_ok (
    $$ select public.accept_family_invitation('redeem-test-token-32chars-min!!') $$,
    '23505',
    'invitation already accepted',
    'replayed token is rejected'
  );

reset role;

insert into public.family_invitations (
  family_id,
  email_normalized,
  role,
  token_hash,
  invited_by,
  expires_at,
  revoked_at
)
values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
  'viewer-a@family-cookbook.test',
  'viewer',
  encode(extensions.digest('revoked-invite-token-32chars-min', 'sha256'), 'hex'),
  '11111111-1111-4111-8111-111111111101'::uuid,
  now() + interval '7 days',
  now()
);

select tests.request_as_user ('11111111-1111-4111-8111-111111111103');

select
  throws_ok (
    $$ select public.accept_family_invitation('revoked-invite-token-32chars-min') $$,
    '23503',
    'invitation revoked',
    'revoked invitation cannot be redeemed'
  );

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
  'admin-a@family-cookbook.test',
  'editor',
  encode(extensions.digest('expired-invite-token-32chars-min', 'sha256'), 'hex'),
  '11111111-1111-4111-8111-111111111101'::uuid,
  now() - interval '1 hour'
);

select tests.request_as_user ('11111111-1111-4111-8111-111111111104');

select
  throws_ok (
    $$ select public.accept_family_invitation('expired-invite-token-32chars-min') $$,
    '22023',
    'invitation expired',
    'expired invitation cannot be redeemed'
  );

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
  'owner-b@family-cookbook.test',
  'viewer',
  encode(extensions.digest('wrong-email-token-32chars-min!!', 'sha256'), 'hex'),
  '11111111-1111-4111-8111-111111111101'::uuid,
  now() + interval '7 days'
);

select tests.request_as_user ('11111111-1111-4111-8111-111111111102');

select
  throws_ok (
    $$ select public.accept_family_invitation('wrong-email-token-32chars-min!!') $$,
    '42501',
    'email does not match invitation',
    'wrong email cannot redeem invitation'
  );

reset role;

select tests.request_as_user ('11111111-1111-4111-8111-111111111101');

select
  throws_ok (
    $$ select public.accept_family_invitation('totally-unknown-token-value!!!') $$,
    'P0002',
    'invitation not found',
    'unknown token is rejected'
  );

select
  *
from
  finish ();

rollback;
