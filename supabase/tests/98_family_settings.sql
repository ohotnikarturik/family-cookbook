begin;

select plan (6);

-- Owner updates family name and default recipe language.
select tests.request_as_user ('11111111-1111-4111-8111-111111111101');

select
  results_eq (
    $$
      with
        updated as (
          update public.families
          set
            name = 'Andersen Test Kitchen (edited)',
            default_language = 'fi'
          where
            id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
          returning
            1
        )
      select count(*)::bigint
      from updated
    $$,
    $$
      values (1::bigint)
    $$,
    'Owner can update family settings'
  );

select
  results_eq (
    $$
      select name, default_language
      from public.families
      where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
    $$,
    $$
      values (
        'Andersen Test Kitchen (edited)'::text,
        'fi'::text
      )
    $$,
    'Settings persisted'
  );

select
  results_eq (
    $$
      select created_by
      from public.families
      where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
    $$,
    $$
      values ('11111111-1111-4111-8111-111111111101'::uuid)
    $$,
    'created_by is immutable'
  );

reset role;

-- Admin can update.
select tests.request_as_user ('11111111-1111-4111-8111-111111111104');

select
  results_eq (
    $$
      with
        updated as (
          update public.families
          set
            default_language = 'en'
          where
            id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
          returning
            1
        )
      select count(*)::bigint
      from updated
    $$,
    $$
      values (1::bigint)
    $$,
    'Admin can update family settings'
  );

reset role;

-- Editor cannot update via RLS.
select tests.request_as_user ('11111111-1111-4111-8111-111111111102');

select
  results_eq (
    $$
      with
        updated as (
          update public.families
          set
            name = 'Editor takeover'
          where
            id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
          returning
            1
        )
      select count(*)::bigint
      from updated
    $$,
    $$
      values (0::bigint)
    $$,
    'Editor cannot update family settings'
  );

reset role;

select tests.request_as_user ('11111111-1111-4111-8111-111111111101');

select
  throws_ok (
    $$
      update public.families
      set
        default_language = 'de'
      where
        id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
    $$,
    '23514',
    null,
    'Invalid default_language rejected'
  );

-- Restore seed name for other suites.
update public.families
set
  name = 'Andersen Test Kitchen',
  default_language = 'en'
where
  id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid;

select * from finish ();

rollback;
