begin;

select plan (18);

-- Seed: family A has owner 101, admin 104, editor 102, viewer 103.
-- Family B owner 201 is a stranger to family A.

-- Editor leaves.
select tests.request_as_user ('11111111-1111-4111-8111-111111111102');

select
  lives_ok (
    $$ select public.leave_family ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid) $$,
    'Editor can leave the family'
  );

select
  is (
    (select count(*)::bigint from public.family_members
      where family_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid),
    0::bigint,
    'After leaving, no membership rows are visible on the next request'
  );

select
  is (
    public.get_my_family_access ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid),
    'left',
    'The leaver is told their state is left'
  );

select
  throws_ok (
    $$ select public.leave_family ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid) $$,
    '42501',
    null,
    'Leaving twice is refused'
  );

reset role;

select
  results_eq (
    $$
      select status::text, role::text
      from public.family_members
      where family_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
        and user_id = '11111111-1111-4111-8111-111111111102'::uuid
    $$,
    $$ values ('left'::text, 'editor'::text) $$,
    'The membership row is kept with status left'
  );

select
  results_eq (
    $$
      select count(*)::bigint
      from public.audit_events
      where family_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
        and event_type = 'family_member.left'
        and actor_user_id = '11111111-1111-4111-8111-111111111102'::uuid
        and metadata->>'user_id' = '11111111-1111-4111-8111-111111111102'
        and metadata->>'from_role' = 'editor'
        and not (metadata ? 'email')
    $$,
    $$ values (1::bigint) $$,
    'Leaving is audited without an email'
  );

-- Sole owner cannot leave.
select tests.request_as_user ('11111111-1111-4111-8111-111111111101');

select
  throws_ok (
    $$ select public.leave_family ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid) $$,
    '22023',
    null,
    'The sole owner cannot leave'
  );

-- A user from another family cannot leave a family they are not in.
reset role;

select tests.request_as_user ('22222222-2222-4222-8222-222222222201');

select
  throws_ok (
    $$ select public.leave_family ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid) $$,
    '42501',
    null,
    'A non-member cannot leave another family'
  );

-- Managers cannot set or undo left.
reset role;

select tests.request_as_user ('11111111-1111-4111-8111-111111111104');

select
  throws_ok (
    $$
      select public.set_family_member_status (
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
        '11111111-1111-4111-8111-111111111103'::uuid,
        'left'::public.membership_status
      )
    $$,
    '22023',
    null,
    'An admin cannot make someone leave'
  );

select
  throws_ok (
    $$
      select public.set_family_member_status (
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
        '11111111-1111-4111-8111-111111111102'::uuid,
        'active'::public.membership_status
      )
    $$,
    '22023',
    null,
    'An admin cannot reactivate someone who left'
  );

reset role;

select tests.request_as_user ('11111111-1111-4111-8111-111111111101');

select
  results_eq (
    $$
      with u as (
        update public.family_members
        set status = 'active'
        where family_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
          and user_id = '11111111-1111-4111-8111-111111111102'::uuid
        returning 1
      )
      select count(*)::bigint from u
    $$,
    $$ values (0::bigint) $$,
    'A direct table update cannot reactivate someone who left'
  );

select
  throws_ok (
    $$
      update public.family_members
      set status = 'left'
      where family_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
        and user_id = '11111111-1111-4111-8111-111111111103'::uuid
    $$,
    '42501',
    null,
    'A direct table update cannot make someone leave'
  );

select
  is (
    (
      select count(*)::bigint
      from public.list_family_member_directory ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid) d
      where d.user_id = '11111111-1111-4111-8111-111111111102'::uuid
    ),
    0::bigint,
    'The member directory does not list people who left'
  );

-- Re-invitation reactivates the same row.
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
  'editor-a@family-cookbook.test',
  'viewer',
  encode(extensions.digest('rejoin-after-leaving-token-32chars!', 'sha256'), 'hex'),
  '11111111-1111-4111-8111-111111111101'::uuid,
  now() + interval '7 days'
);

select tests.request_as_user ('11111111-1111-4111-8111-111111111102');

select
  lives_ok (
    $$ select public.accept_family_invitation ('rejoin-after-leaving-token-32chars!') $$,
    'Someone who left can rejoin with a new invitation'
  );

select
  is (
    public.get_my_family_access ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid),
    null,
    'An active member has no blocked state'
  );

reset role;

select
  results_eq (
    $$
      select count(*)::bigint, min(status::text), min(role::text)
      from public.family_members
      where family_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
        and user_id = '11111111-1111-4111-8111-111111111102'::uuid
    $$,
    $$ values (1::bigint, 'active'::text, 'viewer'::text) $$,
    'Rejoining reuses the one row with the invited role'
  );

-- A suspended member cannot leave, and sees their own state.
select tests.request_as_user ('11111111-1111-4111-8111-111111111101');

select public.set_family_member_status (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
  '11111111-1111-4111-8111-111111111103'::uuid,
  'suspended'::public.membership_status
);

reset role;

select tests.request_as_user ('11111111-1111-4111-8111-111111111103');

select
  throws_ok (
    $$ select public.leave_family ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid) $$,
    '42501',
    null,
    'A suspended member cannot leave'
  );

select
  is (
    public.get_my_family_access ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid),
    'suspended',
    'A suspended member is told their state is suspended'
  );

select * from finish ();

rollback;
