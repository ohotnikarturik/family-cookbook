begin;

select plan (19);

-- Owner promotes viewer to contributor.
select tests.request_as_user ('11111111-1111-4111-8111-111111111101');

select
  lives_ok (
    $$
      select public.set_family_member_role (
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
        '11111111-1111-4111-8111-111111111103'::uuid,
        'contributor'::public.family_role
      )
    $$,
    'Owner can change viewer role'
  );

select
  results_eq (
    $$
      select role::text
      from public.family_members
      where family_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
        and user_id = '11111111-1111-4111-8111-111111111103'::uuid
    $$,
    $$
      values ('contributor'::text)
    $$,
    'Role persisted'
  );

select
  results_eq (
    $$
      select count(*)::bigint
      from public.audit_events
      where family_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
        and event_type = 'family_member.role_changed'
        and entity_type = 'family_member'
        and metadata->>'to_role' = 'contributor'
        and metadata->>'user_id' = '11111111-1111-4111-8111-111111111103'
        and not (metadata ? 'email')
    $$,
    $$
      values (1::bigint)
    $$,
    'Role change is audited without an email'
  );

-- Admin cannot promote to admin.
reset role;

select tests.request_as_user ('11111111-1111-4111-8111-111111111104');

select
  throws_ok (
    $$
      select public.set_family_member_role (
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
        '11111111-1111-4111-8111-111111111102'::uuid,
        'admin'::public.family_role
      )
    $$,
    '22023',
    null,
    'Admin cannot assign admin role'
  );

-- Owner suspends contributor; they lose active membership.
reset role;

select tests.request_as_user ('11111111-1111-4111-8111-111111111101');

select
  lives_ok (
    $$
      select public.set_family_member_status (
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
        '11111111-1111-4111-8111-111111111103'::uuid,
        'suspended'::public.membership_status
      )
    $$,
    'Owner suspends member'
  );

reset role;

select tests.request_as_user ('11111111-1111-4111-8111-111111111103');

select
  is (
    (
      select
        count(*)::bigint
      from
        public.family_members fm
      where
        fm.family_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
        and fm.status = 'active'
    ),
    0::bigint,
    'Suspended member cannot read active membership rows'
  );

reset role;

select tests.request_as_user ('11111111-1111-4111-8111-111111111101');

select
  throws_ok (
    $$
      select public.set_family_member_role (
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
        '11111111-1111-4111-8111-111111111103'::uuid,
        'editor'::public.family_role
      )
    $$,
    '22023',
    null,
    'Suspended member role cannot change'
  );

select
  results_eq (
    $$
      select role::text
      from public.family_members
      where family_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
        and user_id = '11111111-1111-4111-8111-111111111103'::uuid
    $$,
    $$
      values ('contributor'::text)
    $$,
    'Rejected role change leaves the suspended role in place'
  );

-- Cannot suspend owner.
select
  throws_ok (
    $$
      select public.set_family_member_status (
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
        '11111111-1111-4111-8111-111111111101'::uuid,
        'suspended'::public.membership_status
      )
    $$,
    '22023',
    null,
    'Cannot suspend owner (including self)'
  );

-- Owner reactivates suspended member.
select
  lives_ok (
    $$
      select public.set_family_member_status (
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
        '11111111-1111-4111-8111-111111111103'::uuid,
        'active'::public.membership_status
      )
    $$,
    'Owner reactivates member'
  );

reset role;

select tests.request_as_user ('11111111-1111-4111-8111-111111111103');

select
  is (
    (
      select
        count(*)::bigint
      from
        public.family_members fm
      where
        fm.family_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
        and fm.user_id = '11111111-1111-4111-8111-111111111103'::uuid
        and fm.status = 'active'
    ),
    1::bigint,
    'Reactivated member is active again'
  );

-- Editor cannot change membership, including through a direct update.
reset role;

select tests.request_as_user ('11111111-1111-4111-8111-111111111102');

select
  throws_ok (
    $$
      select public.set_family_member_role (
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
        '11111111-1111-4111-8111-111111111103'::uuid,
        'viewer'::public.family_role
      )
    $$,
    '42501',
    null,
    'Editor cannot change roles'
  );

select
  results_eq (
    $$
      with updated as (
        update public.family_members
        set role = 'viewer'
        where family_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
          and user_id = '11111111-1111-4111-8111-111111111103'::uuid
        returning 1
      )
      select count(*)::bigint from updated
    $$,
    $$
      values (0::bigint)
    $$,
    'Editor direct membership update changes nothing'
  );

-- Other family cannot change Family A.
reset role;

select tests.request_as_user ('22222222-2222-4222-8222-222222222201');

select
  throws_ok (
    $$
      select public.set_family_member_status (
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
        '11111111-1111-4111-8111-111111111103'::uuid,
        'suspended'::public.membership_status
      )
    $$,
    '42501',
    null,
    'Other family cannot change members'
  );

-- Owner role stays on the transfer flow.
reset role;

select tests.request_as_user ('11111111-1111-4111-8111-111111111101');

select
  throws_ok (
    $$
      select public.set_family_member_role (
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
        '11111111-1111-4111-8111-111111111103'::uuid,
        'owner'::public.family_role
      )
    $$,
    '22023',
    null,
    'Owner role is not assigned here'
  );

select
  throws_ok (
    $$
      update public.family_members
      set user_id = '22222222-2222-4222-8222-222222222201'::uuid
      where family_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
        and user_id = '11111111-1111-4111-8111-111111111103'::uuid
    $$,
    '42501',
    null,
    'Member identity cannot be rewritten'
  );

-- Admin cannot demote another admin, by RPC or by a direct update.
select
  lives_ok (
    $$
      select public.set_family_member_role (
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
        '11111111-1111-4111-8111-111111111102'::uuid,
        'admin'::public.family_role
      )
    $$,
    'Owner can promote editor to admin'
  );

reset role;

select tests.request_as_user ('11111111-1111-4111-8111-111111111104');

select
  results_eq (
    $$
      with updated as (
        update public.family_members
        set role = 'editor'
        where family_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
          and user_id = '11111111-1111-4111-8111-111111111102'::uuid
        returning 1
      )
      select count(*)::bigint from updated
    $$,
    $$
      values (0::bigint)
    $$,
    'Admin cannot demote another admin directly'
  );

select
  throws_ok (
    $$
      select public.set_family_member_role (
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
        '11111111-1111-4111-8111-111111111102'::uuid,
        'editor'::public.family_role
      )
    $$,
    '42501',
    null,
    'Admin cannot change another admin'
  );

select * from finish ();

rollback;
