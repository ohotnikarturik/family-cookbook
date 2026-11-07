begin;

select plan (5);

-- Fixture ids from docs/fixtures/TEST_IDENTITIES.md
insert into public.recipes (
  id,
  family_id,
  created_by,
  updated_by,
  title,
  source_language
)
values (
  'eeeeeeee-eeee-4eee-8eee-eeeeeeee0001'::uuid,
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
  '11111111-1111-4111-8111-111111111101'::uuid,
  '11111111-1111-4111-8111-111111111101'::uuid,
  'Composite FK test',
  'fi'
);

insert into public.family_tags (
  id,
  family_id,
  name,
  normalized_name,
  created_by
)
values (
  'eeeeeeee-eeee-4eee-8eee-eeeeeeee0201'::uuid,
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid,
  'Family B tag',
  'family b tag',
  '22222222-2222-4222-8222-222222222201'::uuid
);

select
  throws_ok (
    $$
      insert into public.recipe_ingredients (
        recipe_id,
        family_id,
        position,
        name
      )
      values (
        'eeeeeeee-eeee-4eee-8eee-eeeeeeee0001'::uuid,
        'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid,
        1,
        'Wrong family'
      )
    $$,
    '23503',
    null,
    'Ingredient cannot reference recipe with mismatched family_id'
  );

insert into public.recipe_ingredients (
  id,
  recipe_id,
  family_id,
  position,
  name
)
values (
  'eeeeeeee-eeee-4eee-8eee-eeeeeeee0101'::uuid,
  'eeeeeeee-eeee-4eee-8eee-eeeeeeee0001'::uuid,
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
  1,
  'Flour'
);

select
  throws_ok (
    $$
      insert into public.recipe_ingredient_translations (
        ingredient_id,
        family_id,
        language_tag,
        name
      )
      values (
        'eeeeeeee-eeee-4eee-8eee-eeeeeeee0101'::uuid,
        'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid,
        'en',
        'Wrong tenant'
      )
    $$,
    '23503',
    null,
    'Ingredient translation cannot use mismatched family_id'
  );

select
  throws_ok (
    $$
      insert into public.recipe_steps (
        recipe_id,
        family_id,
        position,
        instruction
      )
      values (
        'eeeeeeee-eeee-4eee-8eee-eeeeeeee0001'::uuid,
        'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid,
        1,
        'Wrong family step'
      )
    $$,
    '23503',
    null,
    'Step cannot reference recipe with mismatched family_id'
  );

select
  throws_ok (
    $$
      insert into public.recipe_tags (
        family_id,
        recipe_id,
        tag_id
      )
      values (
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
        'eeeeeeee-eeee-4eee-8eee-eeeeeeee0001'::uuid,
        'eeeeeeee-eeee-4eee-8eee-eeeeeeee0201'::uuid
      )
    $$,
    '23503',
    null,
    'Recipe cannot attach a tag from another family'
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
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
        '   ',
        'placeholder',
        '11111111-1111-4111-8111-111111111101'::uuid
      )
    $$,
    '23514',
    null,
    'Whitespace-only tag name is rejected'
  );

select
  *
from
  finish ();

rollback;
