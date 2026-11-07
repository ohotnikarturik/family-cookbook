-- T2.3: transactional recipe aggregate mutations (SECURITY DEFINER RPCs).

create or replace function private.recipe_mutation_result (p_recipe_id uuid, p_version integer)
returns jsonb
language sql
immutable
set search_path = pg_catalog, public
as $$
  select jsonb_build_object('recipe_id', p_recipe_id, 'version', p_version);
$$;

create or replace function private.recipe_raise_version_conflict (p_current_version integer)
returns void
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  raise exception 'version_conflict'
    using
      errcode = '23514',
      detail = p_current_version::text;
end;
$$;

create or replace function private.recipe_validate_payload (
  p_payload jsonb,
  p_require_collections boolean
)
returns void
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  v_key text;
  v_len integer;
  v_max integer;
begin
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'invalid recipe payload' using errcode = '22023';
  end if;

  if p_payload ->> 'title' is null or char_length(btrim(p_payload ->> 'title')) < 1 then
    raise exception 'title required' using errcode = '22023';
  end if;

  if p_payload ->> 'sourceLanguage' is null
    or char_length(btrim(p_payload ->> 'sourceLanguage')) < 2
  then
    raise exception 'source language required' using errcode = '22023';
  end if;

  for v_key in
    select
      unnest(
        array[
          'ingredients',
          'steps',
          'tags',
          'translations',
          'ingredientTranslations',
          'stepTranslations'
        ]
      )
  loop
    if not (p_payload ? v_key) or jsonb_typeof(p_payload -> v_key) = 'null' then
      if p_require_collections then
        raise exception 'recipe collections required' using errcode = '22023';
      end if;
      continue;
    end if;

    if jsonb_typeof(p_payload -> v_key) <> 'array' then
      raise exception 'recipe collections must be arrays' using errcode = '22023';
    end if;

    v_len := jsonb_array_length(p_payload -> v_key);
    v_max := case v_key
      when 'ingredients' then 500
      when 'steps' then 500
      when 'tags' then 50
      when 'translations' then 20
      else 10000
    end;

    if v_len > v_max then
      raise exception 'recipe collection too large' using errcode = '22023';
    end if;
  end loop;
end;
$$;

create or replace function private.recipe_delete_children (p_recipe_id uuid, p_family_id uuid)
returns void
language sql
security definer
set search_path = pg_catalog, public
as $$
  delete from public.recipe_step_translations
  where
    step_id in (
      select
        s.id
      from
        public.recipe_steps s
      where
        s.recipe_id = p_recipe_id
        and s.family_id = p_family_id
    );

  delete from public.recipe_ingredient_translations
  where
    ingredient_id in (
      select
        i.id
      from
        public.recipe_ingredients i
      where
        i.recipe_id = p_recipe_id
        and i.family_id = p_family_id
    );

  delete from public.recipe_translations
  where
    recipe_id = p_recipe_id
    and family_id = p_family_id;

  delete from public.recipe_tags
  where
    recipe_id = p_recipe_id
    and family_id = p_family_id;

  delete from public.recipe_steps
  where
    recipe_id = p_recipe_id
    and family_id = p_family_id;

  delete from public.recipe_ingredients
  where
    recipe_id = p_recipe_id
    and family_id = p_family_id;
$$;

create or replace function private.recipe_resolve_tag_id (
  p_family_id uuid,
  p_actor uuid,
  p_tag jsonb
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_tag_id uuid;
  v_name text;
  v_normalized text;
begin
  if p_tag ? 'tagId' then
    select
      ft.id
    into
      v_tag_id
    from
      public.family_tags ft
    where
      ft.id = (p_tag ->> 'tagId')::uuid
      and ft.family_id = p_family_id;
    if v_tag_id is null then
      raise exception 'unknown tag' using errcode = '22023';
    end if;
    return v_tag_id;
  end if;

  if p_tag ? 'name' then
    v_name := btrim(p_tag ->> 'name');
    if char_length(v_name) < 1 or char_length(v_name) > 50 then
      raise exception 'invalid tag name' using errcode = '22023';
    end if;
    v_normalized := lower(v_name);
    select
      ft.id
    into
      v_tag_id
    from
      public.family_tags ft
    where
      ft.family_id = p_family_id
      and ft.normalized_name = v_normalized;
    if v_tag_id is not null then
      return v_tag_id;
    end if;
    if not private.can_manage_recipe_tags (p_family_id) then
      raise exception 'cannot create family tags' using errcode = '42501';
    end if;
    insert into public.family_tags (family_id, name, normalized_name, created_by)
    values (p_family_id, v_name, v_normalized, p_actor)
    returning id into v_tag_id;
    return v_tag_id;
  end if;

  raise exception 'invalid tag payload' using errcode = '22023';
end;
$$;

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
    insert into public.recipe_steps (
      recipe_id,
      family_id,
      position,
      instruction,
      duration_minutes
    )
    values (
      p_recipe_id,
      p_family_id,
      (v_item ->> 'position')::integer,
      v_item ->> 'instruction',
      nullif(v_item ->> 'durationMinutes', '')::integer
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

create or replace function private.recipe_build_snapshot (p_recipe_id uuid, p_family_id uuid)
returns jsonb
language sql
security definer
set search_path = pg_catalog, public
as $$
  select
    jsonb_build_object(
      'recipe',
      to_jsonb(r.*) - 'search_document',
      'ingredients',
      (
        select
          coalesce(jsonb_agg(to_jsonb(i.*) order by i.position), '[]'::jsonb)
        from
          public.recipe_ingredients i
        where
          i.recipe_id = p_recipe_id
          and i.family_id = p_family_id
      ),
      'steps',
      (
        select
          coalesce(jsonb_agg(to_jsonb(s.*) order by s.position), '[]'::jsonb)
        from
          public.recipe_steps s
        where
          s.recipe_id = p_recipe_id
          and s.family_id = p_family_id
      ),
      'tags',
      (
        select
          coalesce(
            jsonb_agg(
              jsonb_build_object('tag_id', rt.tag_id, 'name', ft.name)
              order by
                ft.normalized_name
            ),
            '[]'::jsonb
          )
        from
          public.recipe_tags rt
          join public.family_tags ft on ft.id = rt.tag_id and ft.family_id = rt.family_id
        where
          rt.recipe_id = p_recipe_id
          and rt.family_id = p_family_id
      ),
      'translations',
      (
        select
          coalesce(jsonb_agg(to_jsonb(t.*) order by t.language_tag), '[]'::jsonb)
        from
          public.recipe_translations t
        where
          t.recipe_id = p_recipe_id
          and t.family_id = p_family_id
      ),
      'ingredientTranslations',
      (
        select
          coalesce(
            jsonb_agg(to_jsonb(it.*) order by i.position, it.language_tag),
            '[]'::jsonb
          )
        from
          public.recipe_ingredient_translations it
          join public.recipe_ingredients i on i.id = it.ingredient_id
          and i.family_id = it.family_id
        where
          i.recipe_id = p_recipe_id
          and i.family_id = p_family_id
      ),
      'stepTranslations',
      (
        select
          coalesce(
            jsonb_agg(to_jsonb(st.*) order by s.position, st.language_tag),
            '[]'::jsonb
          )
        from
          public.recipe_step_translations st
          join public.recipe_steps s on s.id = st.step_id
          and s.family_id = st.family_id
        where
          s.recipe_id = p_recipe_id
          and s.family_id = p_family_id
      )
    )
  from
    public.recipes r
  where
    r.id = p_recipe_id
    and r.family_id = p_family_id;
$$;

create or replace function private.recipe_write_revision_and_audit (
  p_family_id uuid,
  p_recipe_id uuid,
  p_version integer,
  p_actor uuid,
  p_event_type text,
  p_change_summary text,
  p_snapshot jsonb
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.recipe_revisions (
    family_id,
    recipe_id,
    version,
    changed_by,
    change_summary,
    snapshot
  )
  values (
    p_family_id,
    p_recipe_id,
    p_version,
    p_actor,
    p_change_summary,
    p_snapshot
  );

  insert into public.audit_events (
    family_id,
    actor_user_id,
    event_type,
    entity_type,
    entity_id,
    metadata
  )
  values (
    p_family_id,
    p_actor,
    p_event_type,
    'recipe',
    p_recipe_id,
    jsonb_build_object('recipe_id', p_recipe_id, 'version', p_version)
  );
end;
$$;

create or replace function public.create_recipe_aggregate (p_family_id uuid, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_uid uuid;
  v_recipe_id uuid;
  v_snapshot jsonb;
begin
  v_uid := auth.uid ();
  if v_uid is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if not private.can_create_recipe (p_family_id) then
    raise exception 'recipe create forbidden' using errcode = '42501';
  end if;

  perform private.recipe_validate_payload (p_payload, false);

  insert into public.recipes (
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
    version
  )
  values (
    p_family_id,
    v_uid,
    v_uid,
    btrim(p_payload ->> 'title'),
    nullif(btrim(coalesce(p_payload ->> 'description', '')), ''),
    btrim(p_payload ->> 'sourceLanguage'),
    nullif(btrim(coalesce(p_payload ->> 'category', '')), ''),
    nullif(p_payload ->> 'servings', '')::numeric,
    nullif(p_payload ->> 'prepMinutes', '')::integer,
    nullif(p_payload ->> 'cookMinutes', '')::integer,
    nullif(btrim(coalesce(p_payload ->> 'notes', '')), ''),
    1
  )
  returning id into v_recipe_id;

  perform private.recipe_insert_children (v_recipe_id, p_family_id, v_uid, p_payload);

  v_snapshot := private.recipe_build_snapshot (v_recipe_id, p_family_id);
  perform private.recipe_write_revision_and_audit (
    p_family_id,
    v_recipe_id,
    1,
    v_uid,
    'recipe.created',
    null,
    v_snapshot
  );

  return private.recipe_mutation_result (v_recipe_id, 1);
end;
$$;

create or replace function public.update_recipe_aggregate (
  p_family_id uuid,
  p_recipe_id uuid,
  p_expected_version integer,
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
    raise exception 'recipe update forbidden' using errcode = '42501';
  end if;

  if v_recipe.version <> p_expected_version then
    perform private.recipe_raise_version_conflict (v_recipe.version);
  end if;

  perform private.recipe_validate_payload (p_payload, true);

  v_new_version := v_recipe.version + 1;
  v_change_summary := nullif(btrim(coalesce(p_payload ->> 'changeSummary', '')), '');

  update public.recipes
  set
    title = btrim(p_payload ->> 'title'),
    description = nullif(btrim(coalesce(p_payload ->> 'description', '')), ''),
    source_language = btrim(p_payload ->> 'sourceLanguage'),
    category = nullif(btrim(coalesce(p_payload ->> 'category', '')), ''),
    servings = nullif(p_payload ->> 'servings', '')::numeric,
    prep_minutes = nullif(p_payload ->> 'prepMinutes', '')::integer,
    cook_minutes = nullif(p_payload ->> 'cookMinutes', '')::integer,
    notes = nullif(btrim(coalesce(p_payload ->> 'notes', '')), ''),
    updated_by = v_uid,
    version = v_new_version
  where
    id = p_recipe_id
    and family_id = p_family_id;

  perform private.recipe_delete_children (p_recipe_id, p_family_id);
  perform private.recipe_insert_children (p_recipe_id, p_family_id, v_uid, p_payload);

  v_snapshot := private.recipe_build_snapshot (p_recipe_id, p_family_id);
  perform private.recipe_write_revision_and_audit (
    p_family_id,
    p_recipe_id,
    v_new_version,
    v_uid,
    'recipe.updated',
    v_change_summary,
    v_snapshot
  );

  return private.recipe_mutation_result (p_recipe_id, v_new_version);
end;
$$;

create or replace function public.set_recipe_status (
  p_family_id uuid,
  p_recipe_id uuid,
  p_expected_version integer,
  p_status public.recipe_status,
  p_change_summary text default null
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
  v_event text;
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
    raise exception 'recipe status change forbidden' using errcode = '42501';
  end if;

  if v_recipe.version <> p_expected_version then
    perform private.recipe_raise_version_conflict (v_recipe.version);
  end if;

  if v_recipe.status = p_status then
    return private.recipe_mutation_result (p_recipe_id, v_recipe.version);
  end if;

  v_new_version := v_recipe.version + 1;

  if p_status = 'archived' then
    v_event := 'recipe.archived';
  elsif p_status = 'active' then
    v_event := 'recipe.restored';
  else
    raise exception 'invalid recipe status' using errcode = '22023';
  end if;

  update public.recipes
  set
    status = p_status,
    archived_at = case
      when p_status = 'archived' then now()
      else null
    end,
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
    v_event,
    nullif(btrim(coalesce(p_change_summary, '')), ''),
    v_snapshot
  );

  return private.recipe_mutation_result (p_recipe_id, v_new_version);
end;
$$;

revoke all on function private.recipe_mutation_result (uuid, integer) from public;

revoke all on function private.recipe_raise_version_conflict (integer) from public;

revoke all on function private.recipe_validate_payload (jsonb, boolean) from public;

revoke all on function private.recipe_delete_children (uuid, uuid) from public;

revoke all on function private.recipe_resolve_tag_id (uuid, uuid, jsonb) from public;

revoke all on function private.recipe_insert_children (uuid, uuid, uuid, jsonb) from public;

revoke all on function private.recipe_build_snapshot (uuid, uuid) from public;

revoke all on function private.recipe_write_revision_and_audit (uuid, uuid, integer, uuid, text, text, jsonb) from public;

revoke all on function public.create_recipe_aggregate (uuid, jsonb) from public;

revoke all on function public.update_recipe_aggregate (uuid, uuid, integer, jsonb) from public;

revoke all on function public.set_recipe_status (uuid, uuid, integer, public.recipe_status, text) from public;

grant execute on function public.create_recipe_aggregate (uuid, jsonb) to authenticated;

grant execute on function public.update_recipe_aggregate (uuid, uuid, integer, jsonb) to authenticated;

grant execute on function public.set_recipe_status (uuid, uuid, integer, public.recipe_status, text) to authenticated;
