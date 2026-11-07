begin;

select plan (5);

-- Owner A sees only Family A
select tests.request_as_user ('11111111-1111-4111-8111-111111111101');

select
  results_eq (
    $$ select count(*)::bigint from public.families $$,
    array[1::bigint],
    'Owner A sees exactly one family'
  );

select
  results_eq (
    $$ select count(*)::bigint from public.family_members $$,
    array[5::bigint],
    'Owner A sees Family A members only'
  );

select
  is_empty (
    $$ select 1 from public.families where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid $$,
    'Owner A cannot read Family B'
  );

-- Contributor B sees only Family B
reset role;

select tests.request_as_user ('22222222-2222-4222-8222-222222222202');

select
  results_eq (
    $$ select count(*)::bigint from public.families $$,
    array[1::bigint],
    'Contributor B sees exactly one family'
  );

select
  is_empty (
    $$ select 1 from public.families where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid $$,
    'Contributor B cannot read Family A'
  );

select
  *
from
  finish ();

rollback;
