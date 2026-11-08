begin;

select plan (14);

select tests.request_as_user ('11111111-1111-4111-8111-111111111102');

select
  lives_ok (
    $$
      select public.create_recipe_aggregate(
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
        jsonb_build_object(
          'title',
          'Pairing create',
          'sourceLanguage',
          'en',
          'ingredients',
          jsonb_build_array(
            jsonb_build_object('position', 1, 'name', 'Salt')
          ),
          'steps',
          jsonb_build_array(
            jsonb_build_object('position', 1, 'instruction', 'Mix')
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
    'create pairing fixture recipe'
  );

select
  results_eq (
    $$
      select
        count(*)::bigint
      from
        public.recipe_revisions rr
        join public.recipes r on r.id = rr.recipe_id
        and r.family_id = rr.family_id
      where
        r.title = 'Pairing create'
    $$,
    array[1::bigint],
    'successful create writes one revision row'
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
        r.title = 'Pairing create'
        and ae.entity_type = 'recipe'
    $$,
    array[1::bigint],
    'successful create writes one audit row'
  );

select
  ok (
    (
      select
        ae.metadata = jsonb_build_object(
          'recipe_id',
          (
            select
              id
            from
              public.recipes
            where
              title = 'Pairing create'
            limit
              1
          ),
          'version',
          1
        )
        and not (ae.metadata ? 'title')
        and not (ae.metadata ? 'snapshot')
      from
        public.audit_events ae
        join public.recipes r on r.id = ae.entity_id
        and r.family_id = ae.family_id
      where
        r.title = 'Pairing create'
        and ae.event_type = 'recipe.created'
      limit
        1
    ),
    'create audit metadata contains only recipe_id and version'
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
            title = 'Pairing create'
          limit
            1
        ),
        1,
        jsonb_build_object('title', 'Pairing create', 'sourceLanguage', 'en')
      )
    $$,
    '22023',
    null,
    'invalid update rejected before pairing counts'
  );

select
  results_eq (
    $$
      select
        count(*)::bigint
      from
        public.recipe_revisions rr
        join public.recipes r on r.id = rr.recipe_id
        and r.family_id = rr.family_id
      where
        r.title = 'Pairing create'
    $$,
    array[1::bigint],
    'rejected update does not add revision rows'
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
        r.title = 'Pairing create'
        and ae.entity_type = 'recipe'
    $$,
    array[1::bigint],
    'rejected update does not add audit rows'
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
            title = 'Pairing create'
          limit
            1
        ),
        99,
        jsonb_build_object(
          'title',
          'Stale pairing',
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
    '23514',
    'version_conflict',
    'version conflict does not add rows'
  );

select
  results_eq (
    $$
      select
        count(*)::bigint
      from
        public.recipe_revisions rr
        join public.recipes r on r.id = rr.recipe_id
        and r.family_id = rr.family_id
      where
        r.title = 'Pairing create'
    $$,
    array[1::bigint],
    'version conflict leaves revision count unchanged'
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
        r.title = 'Pairing create'
        and ae.entity_type = 'recipe'
    $$,
    array[1::bigint],
    'version conflict leaves audit count unchanged'
  );

select
  results_eq (
    $$
      select
        (
          public.update_recipe_aggregate(
            'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
            (
              select
                id
              from
                public.recipes
              where
                title = 'Pairing create'
              limit
                1
            ),
            1,
            jsonb_build_object(
              'title',
              'Pairing updated',
              'sourceLanguage',
              'en',
              'ingredients',
              jsonb_build_array(
                jsonb_build_object('position', 1, 'name', 'Salt')
              ),
              'steps',
              jsonb_build_array(
                jsonb_build_object('position', 1, 'instruction', 'Mix')
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
          ) ->> 'version'
        )::integer
    $$,
    array[2],
    'successful update bumps version'
  );

select
  results_eq (
    $$
      select
        count(*)::bigint
      from
        public.recipe_revisions rr
        join public.recipes r on r.id = rr.recipe_id
        and r.family_id = rr.family_id
      where
        r.title = 'Pairing updated'
    $$,
    array[2::bigint],
    'successful update adds one revision row'
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
        r.title = 'Pairing updated'
        and ae.entity_type = 'recipe'
    $$,
    array[2::bigint],
    'successful update adds one audit row'
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
        r.title = 'Pairing updated'
        and ae.event_type = 'recipe.updated'
    $$,
    array[1::bigint],
    'update audit event type is recipe.updated'
  );

select
  *
from
  finish ();

rollback;
