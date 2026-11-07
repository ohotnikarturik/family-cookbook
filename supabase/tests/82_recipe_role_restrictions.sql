begin;

select plan (7);

insert into public.recipes (
  id,
  family_id,
  created_by,
  updated_by,
  title,
  source_language
)
values (
  'eeeeeeee-eeee-4eee-8eee-eeeeeeee0004'::uuid,
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid,
  '22222222-2222-4222-8222-222222222201'::uuid,
  '22222222-2222-4222-8222-222222222201'::uuid,
  'Owner B stew',
  'en'
),
(
  'eeeeeeee-eeee-4eee-8eee-eeeeeeee0005'::uuid,
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
  '11111111-1111-4111-8111-111111111101'::uuid,
  '11111111-1111-4111-8111-111111111101'::uuid,
  'Owner A pie',
  'fi'
);

insert into public.recipe_revisions (
  family_id,
  recipe_id,
  version,
  changed_by,
  snapshot
)
values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
  'eeeeeeee-eeee-4eee-8eee-eeeeeeee0005'::uuid,
  1,
  '11111111-1111-4111-8111-111111111101'::uuid,
  '{}'::jsonb
);

insert into public.audit_events (
  family_id,
  actor_user_id,
  event_type,
  entity_type,
  entity_id
)
values (
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid,
  '22222222-2222-4222-8222-222222222201'::uuid,
  'recipe.created',
  'recipe',
  'eeeeeeee-eeee-4eee-8eee-eeeeeeee0004'::uuid
);

select
  throws_ok (
    $$
      update public.recipes
      set
        family_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
      where
        id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeee0004'::uuid
    $$,
    '42501',
    null,
    'Recipe family_id is immutable'
  );

select tests.request_as_user ('11111111-1111-4111-8111-111111111103');

select
  throws_ok (
    $$
      insert into public.recipes (
        family_id,
        created_by,
        updated_by,
        title,
        source_language
      )
      values (
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
        '11111111-1111-4111-8111-111111111103'::uuid,
        '11111111-1111-4111-8111-111111111103'::uuid,
        'Viewer attempt',
        'en'
      )
    $$,
    '42501',
    null,
    'Viewer cannot create recipes'
  );

select
  throws_ok (
    $$
      insert into public.audit_events (
        family_id,
        actor_user_id,
        event_type,
        entity_type
      )
      values (
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
        '11111111-1111-4111-8111-111111111103'::uuid,
        'recipe.created',
        'recipe'
      )
    $$,
    '42501',
    null,
    'Viewer cannot insert audit events'
  );

select
  is_empty (
    $$ select 1 from public.recipe_revisions $$,
    'Viewer cannot read recipe revisions'
  );

reset role;

select tests.request_as_user ('22222222-2222-4222-8222-222222222202');

update public.recipes
set
  title = 'Tampered',
  updated_by = '22222222-2222-4222-8222-222222222202'::uuid
where
  id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeee0004'::uuid;

select
  results_eq (
    $$ select title from public.recipes where id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeee0004'::uuid $$,
    array['Owner B stew'::text],
    'Contributor cannot update another members recipe'
  );

select
  throws_ok (
    $$
      insert into public.family_tags (
        family_id,
        name,
        normalized_name,
        created_by
      )
      values (
        'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid,
        'Contributor tag',
        'contributor tag',
        '22222222-2222-4222-8222-222222222202'::uuid
      )
    $$,
    '42501',
    null,
    'Contributor cannot create family tags'
  );

select
  is_empty (
    $$ select 1 from public.audit_events $$,
    'Contributor cannot read audit events'
  );

select
  *
from
  finish ();

rollback;
