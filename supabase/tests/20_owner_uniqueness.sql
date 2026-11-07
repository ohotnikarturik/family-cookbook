begin;

select plan (1);

select
  throws_ok (
    $$
      insert into public.family_members (
        id,
        family_id,
        user_id,
        role,
        status,
        joined_at
      )
      values (
        gen_random_uuid (),
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
        '22222222-2222-4222-8222-222222222201'::uuid,
        'owner',
        'active',
        now()
      )
    $$,
    '23505',
    null,
    'Second active owner for the same family violates partial unique index'
  );

select
  *
from
  finish ();

rollback;
