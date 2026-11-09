begin;

select plan (12);

-- Owner transfers to editor; former owner becomes admin (default).
select tests.request_as_user ('11111111-1111-4111-8111-111111111101');

select
  lives_ok (
    $$
      select public.transfer_family_ownership (
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
        '11111111-1111-4111-8111-111111111102'::uuid,
        'admin'::public.family_role
      )
    $$,
    'Owner can transfer ownership'
  );

select
  results_eq (
    $$
      select count(*)::bigint
      from public.family_members
      where family_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
        and status = 'active'
        and role = 'owner'
    $$,
    $$
      values (1::bigint)
    $$,
    'Exactly one active owner remains'
  );

select
  results_eq (
    $$
      select role::text
      from public.family_members
      where family_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
        and user_id = '11111111-1111-4111-8111-111111111102'::uuid
    $$,
    $$
      values ('owner'::text)
    $$,
    'Target is the new owner'
  );

select
  results_eq (
    $$
      select role::text
      from public.family_members
      where family_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
        and user_id = '11111111-1111-4111-8111-111111111101'::uuid
    $$,
    $$
      values ('admin'::text)
    $$,
    'Former owner is demoted'
  );

select
  results_eq (
    $$
      select count(*)::bigint
      from public.audit_events
      where family_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
        and event_type = 'family_member.ownership_transferred'
        and metadata->>'to_user_id' = '11111111-1111-4111-8111-111111111102'
        and metadata->>'former_owner_role' = 'admin'
        and not (metadata ? 'email')
    $$,
    $$
      values (1::bigint)
    $$,
    'Transfer is audited without email'
  );

-- The new owner can transfer it back. The file rolls back, so later tests stay unchanged.
reset role;

select tests.request_as_user ('11111111-1111-4111-8111-111111111102');

select
  lives_ok (
    $$
      select public.transfer_family_ownership (
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
        '11111111-1111-4111-8111-111111111101'::uuid,
        'admin'::public.family_role
      )
    $$,
    'New owner can transfer back'
  );

reset role;

-- Non-owner cannot transfer.
select tests.request_as_user ('11111111-1111-4111-8111-111111111104');

select
  throws_ok (
    $$
      select public.transfer_family_ownership (
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
        '11111111-1111-4111-8111-111111111102'::uuid
      )
    $$,
    '42501',
    null,
    'Admin cannot transfer ownership'
  );

reset role;

select tests.request_as_user ('11111111-1111-4111-8111-111111111101');

select
  throws_ok (
    $$
      select public.transfer_family_ownership (
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
        '11111111-1111-4111-8111-111111111101'::uuid
      )
    $$,
    '22023',
    null,
    'Cannot transfer to self'
  );

select
  throws_ok (
    $$
      select public.transfer_family_ownership (
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
        '11111111-1111-4111-8111-111111111102'::uuid,
        'owner'::public.family_role
      )
    $$,
    '22023',
    null,
    'Former owner cannot stay owner'
  );

reset role;

select tests.request_as_user ('22222222-2222-4222-8222-222222222201');

select
  throws_ok (
    $$
      select public.transfer_family_ownership (
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
        '11111111-1111-4111-8111-111111111102'::uuid
      )
    $$,
    '42501',
    null,
    'Other family cannot transfer ownership'
  );

reset role;

select tests.request_as_user ('11111111-1111-4111-8111-111111111101');

-- Suspended member cannot receive ownership.
select
  lives_ok (
    $$
      select public.set_family_member_status (
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
        '11111111-1111-4111-8111-111111111103'::uuid,
        'suspended'::public.membership_status
      )
    $$,
    'Suspend viewer for negative case'
  );

select
  throws_ok (
    $$
      select public.transfer_family_ownership (
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
        '11111111-1111-4111-8111-111111111103'::uuid
      )
    $$,
    '22023',
    null,
    'Suspended member cannot become owner'
  );

select * from finish ();

rollback;
