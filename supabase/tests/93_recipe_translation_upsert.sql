begin;

select plan (9);

-- Editor A on Family A buns (seeded recipe, version 1)
select tests.request_as_user ('11111111-1111-4111-8111-111111111102');

select
  lives_ok (
    $$
      select public.upsert_recipe_translations(
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
        'eeeeeeee-eeee-4eee-8eee-eeeeeeee0101'::uuid,
        1,
        'fi',
        jsonb_build_object(
          'title',
          'Mummon kardemummapullat (FI)',
          'description',
          'Pehmeät pullat.',
          'ingredients',
          jsonb_build_array(
            jsonb_build_object('position', 1, 'name', 'Jauhot'),
            jsonb_build_object('position', 2, 'name', 'Kardemumma')
          ),
          'steps',
          jsonb_build_array(
            jsonb_build_object('position', 1, 'instruction', 'Lämmitä maito.'),
            jsonb_build_object('position', 2, 'instruction', 'Vaivaa ja muotoile.')
          ),
          'reviewStatus',
          'reviewed'
        )
      )
    $$,
    'Editor can upsert Finnish translation'
  );

select
  is (
    (
      select
        title
      from
        public.recipes
      where
        id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeee0101'::uuid
    ),
    'Grandma''s cardamom buns',
    'Original recipe title unchanged after translation upsert'
  );

select
  is (
    (
      select
        version
      from
        public.recipes
      where
        id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeee0101'::uuid
    ),
    2,
    'Recipe version bumped'
  );

select
  lives_ok (
    $$
      select public.upsert_recipe_translations(
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
        'eeeeeeee-eeee-4eee-8eee-eeeeeeee0101'::uuid,
        2,
        'FI',
        jsonb_build_object(
          'title',
          'Mummon kardemummapullat (FI)',
          'ingredients',
          jsonb_build_array(
            jsonb_build_object('position', 1, 'name', 'Jauhot'),
            jsonb_build_object('position', 2, 'name', 'Kardemumma')
          ),
          'steps',
          jsonb_build_array(
            jsonb_build_object('position', 1, 'instruction', 'Lämmitä maito.'),
            jsonb_build_object('position', 2, 'instruction', 'Vaivaa ja muotoile.')
          )
        )
      )
    $$,
    'Mixed-case language tag updates the existing translation'
  );

select
  is (
    (
      select
        count(*)::integer
      from
        public.recipe_translations
      where
        recipe_id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeee0101'::uuid
        and lower(language_tag) = 'fi'
    ),
    1,
    'FI and fi are one translation row'
  );

select
  throws_ok (
    $$
      select public.upsert_recipe_translations(
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
        'eeeeeeee-eeee-4eee-8eee-eeeeeeee0101'::uuid,
        3,
        'EN',
        jsonb_build_object(
          'title',
          'Same as source',
          'ingredients',
          '[]'::jsonb,
          'steps',
          '[]'::jsonb
        )
      )
    $$,
    '22023',
    null,
    'Source language is rejected regardless of case'
  );

select
  throws_ok (
    $$
      select public.upsert_recipe_translations(
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
        'eeeeeeee-eeee-4eee-8eee-eeeeeeee0101'::uuid,
        1,
        'ru',
        jsonb_build_object(
          'title',
          'Stale version',
          'ingredients',
          '[]'::jsonb,
          'steps',
          '[]'::jsonb
        )
      )
    $$,
    '23514',
    'version_conflict',
    'Stale expected_version rejected'
  );

reset role;

select tests.request_as_user ('11111111-1111-4111-8111-111111111103');

select
  throws_ok (
    $$
      select public.upsert_recipe_translations(
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
        'eeeeeeee-eeee-4eee-8eee-eeeeeeee0101'::uuid,
        2,
        'sv',
        jsonb_build_object(
          'title',
          'Viewer blocked',
          'ingredients',
          '[]'::jsonb,
          'steps',
          '[]'::jsonb
        )
      )
    $$,
    '42501',
    null,
    'Viewer cannot upsert translations'
  );

reset role;

select tests.request_as_user ('22222222-2222-4222-8222-222222222201');

select
  throws_ok (
    $$
      select public.upsert_recipe_translations(
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
        'eeeeeeee-eeee-4eee-8eee-eeeeeeee0101'::uuid,
        2,
        'ru',
        jsonb_build_object(
          'title',
          'Cross family',
          'ingredients',
          '[]'::jsonb,
          'steps',
          '[]'::jsonb
        )
      )
    $$,
    'P0002',
    null,
    'Other family cannot upsert translations on Family A recipe'
  );

select finish ();

rollback;
