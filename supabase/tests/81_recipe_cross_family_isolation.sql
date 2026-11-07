begin;

select plan (6);

insert into public.recipes (
  id,
  family_id,
  created_by,
  updated_by,
  title,
  source_language
)
values (
  'eeeeeeee-eeee-4eee-8eee-eeeeeeee0002'::uuid,
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
  '11111111-1111-4111-8111-111111111101'::uuid,
  '11111111-1111-4111-8111-111111111101'::uuid,
  'Family A secret',
  'fi'
);

insert into public.recipes (
  id,
  family_id,
  created_by,
  updated_by,
  title,
  source_language
)
values (
  'eeeeeeee-eeee-4eee-8eee-eeeeeeee0003'::uuid,
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid,
  '22222222-2222-4222-8222-222222222201'::uuid,
  '22222222-2222-4222-8222-222222222201'::uuid,
  'Family B secret',
  'en'
);

insert into public.recipe_ingredients (
  recipe_id,
  family_id,
  position,
  name
)
values (
  'eeeeeeee-eeee-4eee-8eee-eeeeeeee0003'::uuid,
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid,
  1,
  'Family B ingredient'
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
  'eeeeeeee-eeee-4eee-8eee-eeeeeeee0003'::uuid,
  1,
  '22222222-2222-4222-8222-222222222201'::uuid,
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
  'eeeeeeee-eeee-4eee-8eee-eeeeeeee0003'::uuid
);

select tests.request_as_user ('11111111-1111-4111-8111-111111111101');

select
  results_eq (
    $$ select count(*)::bigint from public.recipes $$,
    array[1::bigint],
    'Owner A sees Family A recipes only'
  );

select
  is_empty (
    $$ select 1 from public.recipes where id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeee0003'::uuid $$,
    'Owner A cannot read Family B recipe'
  );

select
  is_empty (
    $$ select 1 from public.recipe_revisions where recipe_id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeee0003'::uuid $$,
    'Owner A cannot read Family B revisions'
  );

select
  is_empty (
    $$ select 1 from public.audit_events where family_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid $$,
    'Owner A cannot read Family B audit events'
  );

reset role;

select tests.request_as_user ('22222222-2222-4222-8222-222222222202');

select
  is_empty (
    $$ select 1 from public.recipe_ingredients where recipe_id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeee0002'::uuid $$,
    'Contributor B cannot read Family A ingredient rows'
  );

select
  results_eq (
    $$ select count(*)::bigint from public.recipes $$,
    array[1::bigint],
    'Contributor B sees Family B recipes only'
  );

select
  *
from
  finish ();

rollback;
