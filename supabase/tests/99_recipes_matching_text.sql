begin;

select plan (7);

select tests.request_as_user ('11111111-1111-4111-8111-111111111103');

-- Seeded Family A recipes (see supabase/seed): a title match and an ingredient-name match.
select
  isnt_empty (
    $$
      select 1 from public.recipes_matching_text (
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid, 'flour'
      )
    $$,
    'finds recipes by ingredient name'
  );

select
  results_eq (
    $$
      select count(*)::bigint from public.recipes_matching_text (
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid, 'FLOUR'
      )
    $$,
    $$
      select count(distinct r.id)::bigint
      from public.recipes r
      join public.recipe_ingredients i on i.recipe_id = r.id
      where r.family_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
        and i.name ilike '%flour%'
    $$,
    'a recipe with several matching ingredients is returned once, case-insensitively'
  );

select
  is_empty (
    $$
      select 1 from public.recipes_matching_text (
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid, '%'
      )
    $$,
    'wildcard characters are matched literally'
  );

select
  is_empty (
    $$
      select 1 from public.recipes_matching_text (
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid, repeat('a', 201)
      )
    $$,
    'text longer than 200 characters matches nothing'
  );

select
  is_empty (
    $$
      select 1 from public.recipes_matching_text (
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid, '   '
      )
    $$,
    'blank text matches nothing'
  );

-- A Family B member never sees Family A recipes through the function (RLS applies).
reset role;

select tests.request_as_user ('22222222-2222-4222-8222-222222222201');

select
  is_empty (
    $$
      select 1 from public.recipes_matching_text (
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid, 'flour'
      )
    $$,
    'cross-family call returns no rows'
  );

-- Anonymous callers cannot execute it at all.
reset role;

select
  is (
    has_function_privilege('anon', 'public.recipes_matching_text(uuid,text)', 'execute'),
    false,
    'anon has no execute privilege'
  );

select * from finish ();

rollback;
