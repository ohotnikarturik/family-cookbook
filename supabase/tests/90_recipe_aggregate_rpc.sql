begin;

select plan (12);

-- Family A editor
select tests.request_as_user ('11111111-1111-4111-8111-111111111102');

select
  lives_ok (
    $$
      select public.create_recipe_aggregate(
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
        jsonb_build_object(
          'title',
          'RPC test stew',
          'sourceLanguage',
          'fi',
          'ingredients',
          jsonb_build_array(
            jsonb_build_object('position', 1, 'name', 'Water')
          ),
          'steps',
          jsonb_build_array(
            jsonb_build_object('position', 1, 'instruction', 'Boil')
          ),
          'tags',
          '[]'::jsonb,
          'translations',
          '[]'::jsonb,
          'ingredientTranslations',
          '[]'::jsonb,
          'stepTranslations',
          '[]'::jsonb
        )
      )
    $$,
    'Editor can create a recipe via RPC'
  );

reset role;

select tests.request_as_user ('11111111-1111-4111-8111-111111111103');

select
  throws_ok (
    $$
      select public.create_recipe_aggregate(
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
        jsonb_build_object(
          'title',
          'Viewer blocked',
          'sourceLanguage',
          'en'
        )
      )
    $$,
    '42501',
    null,
    'Viewer cannot create via RPC'
  );

reset role;

-- Contributor B updates Owner B recipe (inserted as superuser)
insert into public.recipes (
  id,
  family_id,
  created_by,
  updated_by,
  title,
  source_language,
  version
)
values (
  'eeeeeeee-eeee-4eee-8eee-eeeeeeee0090'::uuid,
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid,
  '22222222-2222-4222-8222-222222222201'::uuid,
  '22222222-2222-4222-8222-222222222201'::uuid,
  'Owner B only',
  'en',
  1
);

insert into public.recipe_revisions (
  family_id,
  recipe_id,
  version,
  changed_by,
  snapshot
)
values (
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid,
  'eeeeeeee-eeee-4eee-8eee-eeeeeeee0090'::uuid,
  1,
  '22222222-2222-4222-8222-222222222201'::uuid,
  '{"recipe":{}}'::jsonb
);

select tests.request_as_user ('22222222-2222-4222-8222-222222222202');

select
  throws_ok (
    $$
      select public.update_recipe_aggregate(
        'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid,
        'eeeeeeee-eeee-4eee-8eee-eeeeeeee0090'::uuid,
        1,
        jsonb_build_object(
          'title',
          'Hijacked',
          'sourceLanguage',
          'en',
          'ingredients',
          '[]'::jsonb,
          'steps',
          '[]'::jsonb,
          'tags',
          '[]'::jsonb,
          'translations',
          '[]'::jsonb,
          'ingredientTranslations',
          '[]'::jsonb,
          'stepTranslations',
          '[]'::jsonb
        )
      )
    $$,
    '42501',
    null,
    'Contributor cannot update another members recipe via RPC'
  );

reset role;

select tests.request_as_user ('11111111-1111-4111-8111-111111111102');

select
  isnt (
    (
      select
        (public.create_recipe_aggregate(
          'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
          jsonb_build_object(
            'title',
            'Version test',
            'sourceLanguage',
            'fi',
            'ingredients',
            '[]'::jsonb,
            'steps',
            '[]'::jsonb,
            'tags',
            '[]'::jsonb,
            'translations',
            '[]'::jsonb,
            'ingredientTranslations',
            '[]'::jsonb,
            'stepTranslations',
            '[]'::jsonb
          )
        ) ->> 'recipe_id')::uuid
    ),
    null::uuid,
    'create RPC returns recipe_id'
  );

select
  throws_ok (
    $$
      select public.update_recipe_aggregate(
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
        (
          select
            id
          from
            public.recipes
          where
            title = 'Version test'
          limit
            1
        ),
        99,
        jsonb_build_object(
          'title',
          'Stale',
          'sourceLanguage',
          'fi',
          'ingredients',
          '[]'::jsonb,
          'steps',
          '[]'::jsonb,
          'tags',
          '[]'::jsonb,
          'translations',
          '[]'::jsonb,
          'ingredientTranslations',
          '[]'::jsonb,
          'stepTranslations',
          '[]'::jsonb
        )
      )
    $$,
    '23514',
    'version_conflict',
    'stale expected_version returns version_conflict'
  );

select
  ok (
    (
      select
        snapshot ? 'translations'
        and snapshot ? 'ingredientTranslations'
        and snapshot ? 'stepTranslations'
        and snapshot -> 'ingredients' -> 0 ->> 'name' = 'Water'
      from
        public.recipe_revisions rr
        join public.recipes r on r.id = rr.recipe_id
        and r.family_id = rr.family_id
      where
        r.title = 'RPC test stew'
        and rr.version = 1
    ),
    'revision snapshot includes ingredients and translations'
  );

select
  throws_ok (
    $$
      select public.update_recipe_aggregate(
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
        (
          select
            id
          from
            public.recipes
          where
            title = 'RPC test stew'
          limit
            1
        ),
        1,
        jsonb_build_object('title', 'RPC test stew', 'sourceLanguage', 'fi')
      )
    $$,
    '22023',
    null,
    'update without child collections is rejected'
  );

select
  results_eq (
    $$
      select
        count(*)::bigint
      from
        public.recipe_ingredients i
        join public.recipes r on r.id = i.recipe_id
        and r.family_id = i.family_id
      where
        r.title = 'RPC test stew'
    $$,
    array[1::bigint],
    'rejected update keeps existing ingredients'
  );

reset role;

select tests.request_as_user ('11111111-1111-4111-8111-111111111101');

select
  throws_ok (
    $$
      select public.update_recipe_aggregate(
        'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid,
        'eeeeeeee-eeee-4eee-8eee-eeeeeeee0090'::uuid,
        1,
        jsonb_build_object(
          'title',
          'Cross tenant',
          'sourceLanguage',
          'en',
          'ingredients',
          '[]'::jsonb,
          'steps',
          '[]'::jsonb,
          'tags',
          '[]'::jsonb,
          'translations',
          '[]'::jsonb,
          'ingredientTranslations',
          '[]'::jsonb,
          'stepTranslations',
          '[]'::jsonb
        )
      )
    $$,
    'P0002',
    null,
    'non-member update does not reveal another family recipe'
  );

reset role;

select tests.request_as_user ('11111111-1111-4111-8111-111111111102');

select
  results_eq (
    $$
      select
        (
          public.set_recipe_status(
            'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
            (
              select
                id
              from
                public.recipes
              where
                title = 'RPC test stew'
              limit
                1
            ),
            1,
            'archived'
          ) ->> 'version'
        )::integer
    $$,
    array[2],
    'archive bumps version once'
  );

select
  results_eq (
    $$
      select
        (
          public.set_recipe_status(
            'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
            (
              select
                id
              from
                public.recipes
              where
                title = 'RPC test stew'
              limit
                1
            ),
            2,
            'archived'
          ) ->> 'version'
        )::integer
    $$,
    array[2],
    'repeating archive does not write another revision'
  );

select
  results_eq (
    $$
      select
        count(*)::bigint
      from
        public.audit_events ae
        join public.recipes r on r.id = ae.entity_id
        and r.family_id = ae.family_id
      where
        r.title = 'RPC test stew'
        and ae.entity_type = 'recipe'
    $$,
    array[2::bigint],
    'repeating archive does not write another audit event'
  );

select
  *
from
  finish ();

rollback;
