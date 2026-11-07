begin;

select plan (3);

set
  local role authenticated;

select
  throws_ok (
    $$ select tests.request_as_user ('11111111-1111-4111-8111-111111111101'::uuid) $$,
    '42501',
    null,
    'authenticated cannot call tests.request_as_user'
  );

reset role;

select tests.request_as_user ('11111111-1111-4111-8111-111111111103');

select
  is_empty (
    $$ select 1 from public.families where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid $$,
    'Viewer A cannot see Family B through RLS policies'
  );

reset role;

select tests.request_as_user ('22222222-2222-4222-8222-222222222202');

select
  is_empty (
    $$ select 1 from public.family_members where family_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid $$,
    'Contributor B RLS hides Family A members despite shared DB'
  );

select
  *
from
  finish ();

rollback;
