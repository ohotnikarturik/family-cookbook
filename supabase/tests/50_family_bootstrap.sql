begin;

select plan (6);

-- Multi Family user creates a new workspace atomically.
select tests.request_as_user ('33333333-3333-4333-8333-333333333301');

select
  isnt (
    public.create_family_bootstrap ('Bootstrap pgTAP Kitchen', 'en'),
    null,
    'create_family_bootstrap returns a family id'
  );

select
  results_eq (
    $$
      select count(*)::bigint
      from public.family_members fm
      join public.families f on f.id = fm.family_id
      where f.name = 'Bootstrap pgTAP Kitchen'
        and fm.user_id = '33333333-3333-4333-8333-333333333301'::uuid
        and fm.role = 'owner'
        and fm.status = 'active'
    $$,
    array[1::bigint],
    'bootstrap creates exactly one active owner membership for creator'
  );

-- Owner A cannot read Family B (regression with preference column present).
reset role;

select tests.request_as_user ('11111111-1111-4111-8111-111111111101');

select
  is_empty (
    $$ select 1 from public.families where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid $$,
    'Owner A still cannot read Family B'
  );

-- last_selected_family_id is nulled when not an active member.
select
  results_eq (
    $$
      update public.profiles
      set last_selected_family_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid
      where user_id = '11111111-1111-4111-8111-111111111101'::uuid
      returning last_selected_family_id
    $$,
    array[null::uuid],
    'invalid last_selected_family_id is cleared by trigger'
  );

select
  results_eq (
    $$
      update public.profiles
      set last_selected_family_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
      where user_id = '11111111-1111-4111-8111-111111111101'::uuid
      returning last_selected_family_id
    $$,
    array['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid],
    'valid last_selected_family_id is kept'
  );

reset role;

select tests.request_as_user ('11111111-1111-4111-8111-111111111101');

select
  throws_ok (
    $$ select public.create_family_bootstrap ('', 'en') $$,
    '22023',
    'family name length must be between 1 and 120',
    'empty family name is rejected'
  );

select
  *
from
  finish ();

rollback;
