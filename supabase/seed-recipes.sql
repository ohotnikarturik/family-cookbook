-- Recipe browse fixtures for T2.4 UI tests. Sourced from seed.sql after family seed.
-- IDs documented in docs/fixtures/TEST_IDENTITIES.md

do $$
declare
  v_family_a uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  v_family_b uuid := 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  v_owner_a uuid := '11111111-1111-4111-8111-111111111101';
  v_owner_b uuid := '22222222-2222-4222-8222-222222222201';
  v_contributor_b uuid := '22222222-2222-4222-8222-222222222202';
  v_recipe_id uuid;
  v_i integer;
begin
  insert into public.family_tags (id, family_id, name, normalized_name, created_by)
  values
    (
      'dddddddd-dddd-4ddd-8ddd-dddddddd0101'::uuid,
      v_family_a,
      'dessert',
      'dessert',
      v_owner_a
    ),
    (
      'dddddddd-dddd-4ddd-8ddd-dddddddd0102'::uuid,
      v_family_a,
      'fish',
      'fish',
      v_owner_a
    ),
    (
      'dddddddd-dddd-4ddd-8ddd-dddddddd0201'::uuid,
      v_family_b,
      'breakfast',
      'breakfast',
      v_owner_b
    );

  insert into public.recipes (
    id,
    family_id,
    created_by,
    updated_by,
    title,
    description,
    source_language,
    category,
    servings,
    prep_minutes,
    cook_minutes,
    notes,
    status,
    archived_at,
    updated_at
  )
  values
    (
      'eeeeeeee-eeee-4eee-8eee-eeeeeeee0101'::uuid,
      v_family_a,
      v_owner_a,
      v_owner_a,
      'Grandma''s cardamom buns',
      'Soft pulla-style buns with cardamom and pearl sugar.',
      'fi',
      'Baking',
      12,
      45,
      25,
      'Best on the day they are baked.',
      'active',
      null,
      now() - interval '2 days'
    ),
    (
      'eeeeeeee-eeee-4eee-8eee-eeeeeeee0102'::uuid,
      v_family_a,
      v_owner_a,
      v_owner_a,
      'Weeknight salmon soup',
      'Light salmon and potato soup for busy evenings.',
      'en',
      'Main',
      4,
      15,
      30,
      null,
      'active',
      null,
      now() - interval '1 day'
    ),
    (
      'eeeeeeee-eeee-4eee-8eee-eeeeeeee0103'::uuid,
      v_family_a,
      v_owner_a,
      v_owner_a,
      'Archived beet salad',
      'A retired family favourite kept for history.',
      'en',
      'Salad',
      6,
      20,
      0,
      null,
      'archived',
      now() - interval '30 days',
      now() - interval '90 days'
    ),
    (
      'eeeeeeee-eeee-4eee-8eee-eeeeeeee0201'::uuid,
      v_family_b,
      v_contributor_b,
      v_contributor_b,
      'Contributor''s pancakes',
      'Fluffy weekend pancakes.',
      'ru',
      'Breakfast',
      4,
      10,
      15,
      null,
      'active',
      null,
      now() - interval '3 hours'
    ),
    (
      'eeeeeeee-eeee-4eee-8eee-eeeeeeee0202'::uuid,
      v_family_b,
      v_owner_b,
      v_owner_b,
      'Owner B house bread',
      'Daily loaf with a crisp crust.',
      'en',
      'Baking',
      8,
      20,
      40,
      null,
      'active',
      null,
      now() - interval '5 hours'
    );

  for v_i in 104..131 loop
    v_recipe_id :=
      ('eeeeeeee-eeee-4eee-8eee-eeeeeeee' || lpad(v_i::text, 4, '0'))::uuid;
    insert into public.recipes (
      id,
      family_id,
      created_by,
      updated_by,
      title,
      source_language,
      category,
      status,
      updated_at
    )
    values (
      v_recipe_id,
      v_family_a,
      v_owner_a,
      v_owner_a,
      'Family A filler recipe ' || (v_i - 100)::text,
      'en',
      case when v_i % 3 = 0 then 'Baking' else 'Main' end,
      'active',
      now() - (v_i || ' hours')::interval
    );
  end loop;

  insert into public.recipe_ingredients (id, recipe_id, family_id, position, name, quantity_text)
  values
    (
      'cccccccc-cccc-4ccc-8ccc-cccccccc0101'::uuid,
      'eeeeeeee-eeee-4eee-8eee-eeeeeeee0101'::uuid,
      v_family_a,
      1,
      'All-purpose flour',
      '500 g'
    ),
    (
      'cccccccc-cccc-4ccc-8ccc-cccccccc0102'::uuid,
      'eeeeeeee-eeee-4eee-8eee-eeeeeeee0101'::uuid,
      v_family_a,
      2,
      'Cardamom',
      '2 tsp'
    ),
    (
      'cccccccc-cccc-4ccc-8ccc-cccccccc0103'::uuid,
      'eeeeeeee-eeee-4eee-8eee-eeeeeeee0102'::uuid,
      v_family_a,
      1,
      'Salmon fillet',
      '400 g'
    );

  insert into public.recipe_steps (id, recipe_id, family_id, position, instruction)
  values
    (
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0101'::uuid,
      'eeeeeeee-eeee-4eee-8eee-eeeeeeee0101'::uuid,
      v_family_a,
      1,
      'Warm the milk and dissolve the yeast.'
    ),
    (
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0102'::uuid,
      'eeeeeeee-eeee-4eee-8eee-eeeeeeee0101'::uuid,
      v_family_a,
      2,
      'Knead until smooth, rise until doubled, shape buns.'
    ),
    (
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0103'::uuid,
      'eeeeeeee-eeee-4eee-8eee-eeeeeeee0102'::uuid,
      v_family_a,
      1,
      'Simmer potatoes and leeks until tender, then flake in salmon.'
    );

  insert into public.recipe_tags (recipe_id, family_id, tag_id)
  values
    (
      'eeeeeeee-eeee-4eee-8eee-eeeeeeee0101'::uuid,
      v_family_a,
      'dddddddd-dddd-4ddd-8ddd-dddddddd0101'::uuid
    ),
    (
      'eeeeeeee-eeee-4eee-8eee-eeeeeeee0102'::uuid,
      v_family_a,
      'dddddddd-dddd-4ddd-8ddd-dddddddd0102'::uuid
    ),
    (
      'eeeeeeee-eeee-4eee-8eee-eeeeeeee0201'::uuid,
      v_family_b,
      'dddddddd-dddd-4ddd-8ddd-dddddddd0201'::uuid
    );
end $$;
