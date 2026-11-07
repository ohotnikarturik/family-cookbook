begin;

select plan (5);

-- Viewer A cannot invite
select tests.request_as_user ('11111111-1111-4111-8111-111111111103');

select
  throws_ok (
    $$
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
        'new-invite@family-cookbook.test',
        'viewer',
        encode(digest('test-token-viewer', 'sha256'), 'hex'),
        '11111111-1111-4111-8111-111111111103'::uuid,
        now() + interval '7 days'
      )
    $$,
    '42501',
    null,
    'Viewer cannot create invitations'
  );

-- Editor A cannot add members
reset role;

select tests.request_as_user ('11111111-1111-4111-8111-111111111102');

select
  throws_ok (
    $$
      insert into public.family_members (
        family_id,
        user_id,
        role,
        status
      )
      values (
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
        '22222222-2222-4222-8222-222222222202'::uuid,
        'contributor',
        'active'
      )
    $$,
    '42501',
    null,
    'Editor cannot add family members'
  );

-- Admin A cannot invite another admin
reset role;

select tests.request_as_user ('11111111-1111-4111-8111-111111111104');

select
  throws_ok (
    $$
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
        'new-admin@family-cookbook.test',
        'admin',
        encode(digest('test-token-admin', 'sha256'), 'hex'),
        '11111111-1111-4111-8111-111111111104'::uuid,
        now() + interval '7 days'
      )
    $$,
    '42501',
    null,
    'Admin cannot invite another admin'
  );

-- Admin A cannot add owner role
select
  throws_ok (
    $$
      insert into public.family_members (
        family_id,
        user_id,
        role,
        status
      )
      values (
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
        '22222222-2222-4222-8222-222222222201'::uuid,
        'owner',
        'active'
      )
    $$,
    '42501',
    null,
    'Admin cannot insert owner membership'
  );

-- Owner A can invite an editor (positive control)
reset role;

select tests.request_as_user ('11111111-1111-4111-8111-111111111101');

select
  lives_ok (
    $$
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
        'positive-editor@family-cookbook.test',
        'editor',
        encode(digest('test-token-positive', 'sha256'), 'hex'),
        '11111111-1111-4111-8111-111111111101'::uuid,
        now() + interval '7 days'
      )
    $$,
    'Owner can create a non-owner invitation'
  );

select
  *
from
  finish ();

rollback;
