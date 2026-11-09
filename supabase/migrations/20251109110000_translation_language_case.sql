-- Language tags are case-insensitive BCP 47. Store the lowercase form so EN and en
-- update one row, and reject a tag that only differs from the source language by case.

-- Keep one row per recipe/ingredient/step and lowercase tag. Prefer a row that is
-- already lowercase when both cases exist.
delete from public.recipe_translations variant
where variant.ctid in (
  select ranked.ctid
  from (
    select
      ctid,
      row_number() over (
        partition by recipe_id, lower(btrim(language_tag))
        order by (language_tag = lower(btrim(language_tag))) desc, ctid
      ) as rn
    from public.recipe_translations
  ) ranked
  where ranked.rn > 1
);

update public.recipe_translations
set language_tag = lower(btrim(language_tag))
where language_tag <> lower(btrim(language_tag));

delete from public.recipe_ingredient_translations variant
where variant.ctid in (
  select ranked.ctid
  from (
    select
      ctid,
      row_number() over (
        partition by ingredient_id, lower(btrim(language_tag))
        order by (language_tag = lower(btrim(language_tag))) desc, ctid
      ) as rn
    from public.recipe_ingredient_translations
  ) ranked
  where ranked.rn > 1
);

update public.recipe_ingredient_translations
set language_tag = lower(btrim(language_tag))
where language_tag <> lower(btrim(language_tag));

delete from public.recipe_step_translations variant
where variant.ctid in (
  select ranked.ctid
  from (
    select
      ctid,
      row_number() over (
        partition by step_id, lower(btrim(language_tag))
        order by (language_tag = lower(btrim(language_tag))) desc, ctid
      ) as rn
    from public.recipe_step_translations
  ) ranked
  where ranked.rn > 1
);

update public.recipe_step_translations
set language_tag = lower(btrim(language_tag))
where language_tag <> lower(btrim(language_tag));

create or replace function public.upsert_recipe_translations (
  p_family_id uuid,
  p_recipe_id uuid,
  p_expected_version integer,
  p_language_tag text,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_uid uuid;
  v_recipe public.recipes%rowtype;
  v_new_version integer;
  v_snapshot jsonb;
  v_change_summary text;
  v_language text;
  v_review_status public.translation_review_status;
  v_mark_reviewed boolean;
  v_item jsonb;
  v_position integer;
  v_ingredient_id uuid;
  v_step_id uuid;
begin
  v_uid := auth.uid ();
  if v_uid is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select
    *
  into
    v_recipe
  from
    public.recipes r
  where
    r.id = p_recipe_id
    and r.family_id = p_family_id
  for update;

  if not found then
    raise exception 'recipe not found' using errcode = 'P0002';
  end if;

  if not private.is_active_member (p_family_id) then
    raise exception 'recipe not found' using errcode = 'P0002';
  end if;

  if not private.can_edit_recipe (p_family_id, v_recipe.created_by) then
    raise exception 'recipe translation forbidden' using errcode = '42501';
  end if;

  if v_recipe.version <> p_expected_version then
    perform private.recipe_raise_version_conflict (v_recipe.version);
  end if;

  v_language := lower(btrim(p_language_tag));

  if v_language !~ '^[a-z]{2,3}(-[a-z0-9]{2,8})*$' then
    raise exception 'invalid translation language' using errcode = '22023';
  end if;

  if v_language = lower(btrim(v_recipe.source_language)) then
    raise exception 'translation language must differ from source' using errcode = '22023';
  end if;

  perform private.recipe_validate_translation_payload (p_payload);

  v_mark_reviewed := coalesce(p_payload ->> 'reviewStatus', 'unreviewed') = 'reviewed'
    and private.has_family_role (
      p_family_id,
      array['owner', 'admin', 'editor']::public.family_role[]
    );

  if v_mark_reviewed then
    v_review_status := 'reviewed';
  else
    v_review_status := 'unreviewed';
  end if;

  insert into public.recipe_translations (
    recipe_id,
    family_id,
    language_tag,
    title,
    description,
    notes,
    created_by,
    review_status,
    reviewed_by,
    reviewed_at
  )
  values (
    p_recipe_id,
    p_family_id,
    v_language,
    btrim(p_payload ->> 'title'),
    nullif(btrim(coalesce(p_payload ->> 'description', '')), ''),
    nullif(btrim(coalesce(p_payload ->> 'notes', '')), ''),
    v_uid,
    v_review_status,
    case when v_mark_reviewed then v_uid else null end,
    case when v_mark_reviewed then now() else null end
  )
  on conflict (recipe_id, language_tag) do update
  set
    title = excluded.title,
    description = excluded.description,
    notes = excluded.notes,
    review_status = excluded.review_status,
    reviewed_by = excluded.reviewed_by,
    reviewed_at = excluded.reviewed_at;

  delete from public.recipe_ingredient_translations it
  using public.recipe_ingredients i
  where
    it.ingredient_id = i.id
    and it.family_id = i.family_id
    and i.recipe_id = p_recipe_id
    and i.family_id = p_family_id
    and it.language_tag = v_language;

  delete from public.recipe_step_translations st
  using public.recipe_steps s
  where
    st.step_id = s.id
    and st.family_id = s.family_id
    and s.recipe_id = p_recipe_id
    and s.family_id = p_family_id
    and st.language_tag = v_language;

  for v_item in
    select
      value
    from
      jsonb_array_elements(p_payload -> 'ingredients')
  loop
    v_position := (v_item ->> 'position')::integer;
    select
      i.id
    into
      v_ingredient_id
    from
      public.recipe_ingredients i
    where
      i.recipe_id = p_recipe_id
      and i.family_id = p_family_id
      and i.position = v_position;
    if v_ingredient_id is null then
      raise exception 'invalid ingredient translation position' using errcode = '22023';
    end if;
    insert into public.recipe_ingredient_translations (ingredient_id, family_id, language_tag, name, notes)
    values (
      v_ingredient_id,
      p_family_id,
      v_language,
      btrim(v_item ->> 'name'),
      nullif(btrim(coalesce(v_item ->> 'notes', '')), '')
    );
  end loop;

  for v_item in
    select
      value
    from
      jsonb_array_elements(p_payload -> 'steps')
  loop
    v_position := (v_item ->> 'position')::integer;
    select
      s.id
    into
      v_step_id
    from
      public.recipe_steps s
    where
      s.recipe_id = p_recipe_id
      and s.family_id = p_family_id
      and s.position = v_position;
    if v_step_id is null then
      raise exception 'invalid step translation position' using errcode = '22023';
    end if;
    insert into public.recipe_step_translations (step_id, family_id, language_tag, instruction)
    values (
      v_step_id,
      p_family_id,
      v_language,
      btrim(v_item ->> 'instruction')
    );
  end loop;

  v_new_version := v_recipe.version + 1;
  v_change_summary := nullif(btrim(coalesce(p_payload ->> 'changeSummary', '')), '');

  update public.recipes
  set
    updated_by = v_uid,
    version = v_new_version
  where
    id = p_recipe_id
    and family_id = p_family_id;

  v_snapshot := private.recipe_build_snapshot (p_recipe_id, p_family_id);
  perform private.recipe_write_revision_and_audit (
    p_family_id,
    p_recipe_id,
    v_new_version,
    v_uid,
    'recipe.translation_updated',
    v_change_summary,
    v_snapshot
  );

  return private.recipe_mutation_result (p_recipe_id, v_new_version);
end;
$$;

