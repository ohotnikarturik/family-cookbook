begin;

select plan (8);

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
    $$ select id
       from public.recipes
       where id in (
         'eeeeeeee-eeee-4eee-8eee-eeeeeeee0002'::uuid,
         'eeeeeeee-eeee-4eee-8eee-eeeeeeee0003'::uuid
       )
       order by id $$,
    $$ select 'eeeeeeee-eeee-4eee-8eee-eeeeeeee0002'::uuid $$,
    'Owner A sees the Family A test recipe and not the Family B test recipe'
  );

select
  is_empty (
    $$ select 1 from public.recipes where id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeee0201'::uuid $$,
    'Owner A cannot read Family B seed recipes'
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
    $$ select id
       from public.recipes
       where id in (
         'eeeeeeee-eeee-4eee-8eee-eeeeeeee0002'::uuid,
         'eeeeeeee-eeee-4eee-8eee-eeeeeeee0003'::uuid
       )
       order by id $$,
    $$ select 'eeeeeeee-eeee-4eee-8eee-eeeeeeee0003'::uuid $$,
    'Contributor B sees the Family B test recipe and not the Family A test recipe'
  );

select
  is_empty (
    $$ select 1 from public.recipes where id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeee0101'::uuid $$,
    'Contributor B cannot read Family A seed recipes'
  );

select
  *
from
  finish ();

rollback;
