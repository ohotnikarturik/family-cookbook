begin;

select plan (5);

select
  is (
    pg_get_function_result('public.list_family_member_directory(uuid)'::regprocedure),
    'TABLE(user_id uuid, role family_role, status membership_status, display_name text)',
    'directory result columns exclude email'
  );

-- Viewer A can list Family A directory (names only, no email column).
select tests.request_as_user ('11111111-1111-4111-8111-111111111103');

select
  isnt_empty (
    $$
      select * from public.list_family_member_directory (
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
      )
    $$,
    'Viewer can list co-members'
  );

select
  results_eq (
    $$
      select count(*)::bigint
      from public.list_family_member_directory (
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
      )
    $$,
    $$
      select count(*)::bigint from public.family_members
      where family_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
    $$,
    'Directory returns every membership row'
  );

-- Family B user cannot list Family A.
reset role;

select tests.request_as_user ('22222222-2222-4222-8222-222222222201');

select
  throws_ok (
    $$
      select * from public.list_family_member_directory (
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
      )
    $$,
    '42501',
    null,
    'Cross-family directory denied'
  );

-- Directory returns profile display names (not auth email).
reset role;

select tests.request_as_user ('11111111-1111-4111-8111-111111111101');

select
  results_eq (
    $$
      select display_name::text
      from public.list_family_member_directory (
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
      )
      where user_id = '11111111-1111-4111-8111-111111111101'::uuid
    $$,
    $$
      values ('Owner A'::text)
    $$,
    'Directory exposes co-member display name'
  );

select * from finish ();

rollback;
