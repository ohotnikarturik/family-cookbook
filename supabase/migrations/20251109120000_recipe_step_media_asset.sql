-- W35.1: persist recipe_steps.media_asset_id from the aggregate payload.
-- The original insert function omitted the column, so saving a recipe dropped step photos.
-- CREATE OR REPLACE keeps the existing owner and grants.

create or replace function private.recipe_insert_children (
  p_recipe_id uuid,
  p_family_id uuid,
  p_actor uuid,
  p_payload jsonb
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_item jsonb;
  v_ingredient_id uuid;
  v_step_id uuid;
  v_position integer;
  v_tag_id uuid;
  v_media_text text;
  v_media_id uuid;
begin
  for v_item in
    select
      value
    from
      jsonb_array_elements(coalesce(p_payload -> 'ingredients', '[]'::jsonb))
  loop
    insert into public.recipe_ingredients (
      recipe_id,
      family_id,
      position,
      name,
      quantity,
      quantity_text,
      unit,
      notes
    )
    values (
      p_recipe_id,
      p_family_id,
      (v_item ->> 'position')::integer,
      v_item ->> 'name',
      nullif(v_item ->> 'quantity', '')::numeric,
      nullif(v_item ->> 'quantityText', ''),
      nullif(v_item ->> 'unit', ''),
      nullif(v_item ->> 'notes', '')
    );
  end loop;

  for v_item in
    select
      value
    from
      jsonb_array_elements(coalesce(p_payload -> 'steps', '[]'::jsonb))
  loop
    v_media_text := nullif(btrim(v_item ->> 'mediaAssetId'), '');
    v_media_id := null;
    if v_media_text is not null then
      if v_media_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
        raise exception 'invalid step media asset' using errcode = '22023';
      end if;
      v_media_id := v_media_text::uuid;
      if not exists (
        select
          1
        from
          public.recipe_assets ra
        where
          ra.id = v_media_id
          and ra.family_id = p_family_id
          and ra.recipe_id = p_recipe_id
          and ra.processing_status = 'available'
          and ra.asset_kind = 'step_photo'
          and ra.detected_mime_type in ('image/jpeg', 'image/png', 'image/webp')
      ) then
        raise exception 'invalid step media asset' using errcode = '22023';
      end if;
    end if;

    insert into public.recipe_steps (
      recipe_id,
      family_id,
      position,
      instruction,
      duration_minutes,
      media_asset_id
    )
    values (
      p_recipe_id,
      p_family_id,
      (v_item ->> 'position')::integer,
      v_item ->> 'instruction',
      nullif(v_item ->> 'durationMinutes', '')::integer,
      v_media_id
    );
  end loop;

  for v_item in
    select
      value
    from
      jsonb_array_elements(coalesce(p_payload -> 'tags', '[]'::jsonb))
  loop
    v_tag_id := private.recipe_resolve_tag_id (p_family_id, p_actor, v_item);
    insert into public.recipe_tags (family_id, recipe_id, tag_id)
    values (p_family_id, p_recipe_id, v_tag_id)
    on conflict (recipe_id, tag_id) do nothing;
  end loop;

  for v_item in
    select
      value
    from
      jsonb_array_elements(coalesce(p_payload -> 'translations', '[]'::jsonb))
  loop
    insert into public.recipe_translations (
      recipe_id,
      family_id,
      language_tag,
      title,
      description,
      notes,
      created_by
    )
    values (
      p_recipe_id,
      p_family_id,
      v_item ->> 'languageTag',
      v_item ->> 'title',
      nullif(v_item ->> 'description', ''),
      nullif(v_item ->> 'notes', ''),
      p_actor
    );
  end loop;

  for v_item in
    select
      value
    from
      jsonb_array_elements(coalesce(p_payload -> 'ingredientTranslations', '[]'::jsonb))
  loop
    v_position := (v_item ->> 'ingredientPosition')::integer;
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
    insert into public.recipe_ingredient_translations (
      ingredient_id,
      family_id,
      language_tag,
      name,
      notes
    )
    values (
      v_ingredient_id,
      p_family_id,
      v_item ->> 'languageTag',
      v_item ->> 'name',
      nullif(v_item ->> 'notes', '')
    );
  end loop;

  for v_item in
    select
      value
    from
      jsonb_array_elements(coalesce(p_payload -> 'stepTranslations', '[]'::jsonb))
  loop
    v_position := (v_item ->> 'stepPosition')::integer;
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
      v_item ->> 'languageTag',
      v_item ->> 'instruction'
    );
  end loop;
end;
$$;

comment on table public.recipe_steps is
  'Ordered steps for a recipe. media_asset_id references an available step_photo on the same recipe.';
