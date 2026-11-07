-- Recipe tenant schema, search indexes, private ACL helpers, RLS (PROJECT_SPEC §7.1; T2.2).

create extension if not exists pg_trgm
with
  schema extensions;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.recipe_status as enum ('active', 'archived');

create type public.translation_review_status as enum ('unreviewed', 'reviewed');

-- ---------------------------------------------------------------------------
-- Helper: normalize family tag names (tenant-local uniqueness)
-- ---------------------------------------------------------------------------

create or replace function private.family_tag_normalize_name ()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  new.normalized_name := lower(btrim(new.name));
  return new;
end;
$$;

revoke all on function private.family_tag_normalize_name () from public;

grant execute on function private.family_tag_normalize_name () to authenticated;

-- ---------------------------------------------------------------------------
-- recipes
-- ---------------------------------------------------------------------------

create table public.recipes (
  id uuid primary key default gen_random_uuid (),
  family_id uuid not null references public.families (id) on delete restrict,
  created_by uuid not null references public.profiles (user_id),
  updated_by uuid not null references public.profiles (user_id),
  title text not null,
  description text null,
  source_language text not null,
  category text null,
  servings numeric(8, 2) null,
  prep_minutes integer null,
  cook_minutes integer null,
  notes text null,
  status public.recipe_status not null default 'active',
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz null,
  search_document tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(category, '')), 'C')
  ) stored,
  constraint recipes_id_family_uniq unique (id, family_id),
  constraint recipes_title_len_ck check (
    char_length(title) >= 1
    and char_length(title) <= 200
  ),
  constraint recipes_description_len_ck check (
    description is null
    or (
      char_length(description) >= 1
      and char_length(description) <= 5000
    )
  ),
  constraint recipes_category_len_ck check (
    category is null
    or (
      char_length(category) >= 1
      and char_length(category) <= 80
    )
  ),
  constraint recipes_notes_len_ck check (
    notes is null
    or (
      char_length(notes) >= 1
      and char_length(notes) <= 10000
    )
  ),
  constraint recipes_source_language_ck check (
    char_length(source_language) >= 2
    and char_length(source_language) <= 35
    and source_language ~ '^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})*$'
  ),
  constraint recipes_servings_positive_ck check (
    servings is null
    or servings > 0
  ),
  constraint recipes_prep_minutes_ck check (
    prep_minutes is null
    or (
      prep_minutes >= 0
      and prep_minutes <= 525600
    )
  ),
  constraint recipes_cook_minutes_ck check (
    cook_minutes is null
    or (
      cook_minutes >= 0
      and cook_minutes <= 525600
    )
  ),
  constraint recipes_version_ck check (version >= 1)
);

comment on table public.recipes is 'Family-scoped recipe aggregate root.';

create index recipes_family_id_status_updated_at_idx on public.recipes (family_id, status, updated_at desc);

create index recipes_family_id_created_by_updated_at_idx on public.recipes (family_id, created_by, updated_at desc);

create index recipes_title_trgm_idx on public.recipes using gin (title gin_trgm_ops);

create index recipes_search_document_idx on public.recipes using gin (search_document);

create trigger recipes_set_updated_at
before update on public.recipes
for each row
execute function public.set_updated_at ();

-- ---------------------------------------------------------------------------
-- recipe_ingredients
-- ---------------------------------------------------------------------------

create table public.recipe_ingredients (
  id uuid primary key default gen_random_uuid (),
  recipe_id uuid not null,
  family_id uuid not null,
  position integer not null,
  name text not null,
  quantity numeric(12, 4) null,
  quantity_text text null,
  unit text null,
  notes text null,
  constraint recipe_ingredients_id_family_uniq unique (id, family_id),
  constraint recipe_ingredients_recipe_position_uniq unique (recipe_id, position),
  constraint recipe_ingredients_recipe_family_fk foreign key (recipe_id, family_id) references public.recipes (id, family_id) on delete cascade,
  constraint recipe_ingredients_position_ck check (position >= 1),
  constraint recipe_ingredients_name_len_ck check (
    char_length(name) >= 1
    and char_length(name) <= 200
  ),
  constraint recipe_ingredients_quantity_positive_ck check (
    quantity is null
    or quantity > 0
  ),
  constraint recipe_ingredients_quantity_text_len_ck check (
    quantity_text is null
    or (
      char_length(quantity_text) >= 1
      and char_length(quantity_text) <= 120
    )
  ),
  constraint recipe_ingredients_unit_len_ck check (
    unit is null
    or (
      char_length(unit) >= 1
      and char_length(unit) <= 60
    )
  ),
  constraint recipe_ingredients_notes_len_ck check (
    notes is null
    or (
      char_length(notes) >= 1
      and char_length(notes) <= 500
    )
  )
);

comment on table public.recipe_ingredients is 'Ordered ingredients for a recipe.';

create index recipe_ingredients_family_id_name_idx on public.recipe_ingredients (family_id, name);

-- ---------------------------------------------------------------------------
-- recipe_steps
-- ---------------------------------------------------------------------------

create table public.recipe_steps (
  id uuid primary key default gen_random_uuid (),
  recipe_id uuid not null,
  family_id uuid not null,
  position integer not null,
  instruction text not null,
  duration_minutes integer null,
  media_asset_id uuid null,
  constraint recipe_steps_id_family_uniq unique (id, family_id),
  constraint recipe_steps_recipe_position_uniq unique (recipe_id, position),
  constraint recipe_steps_recipe_family_fk foreign key (recipe_id, family_id) references public.recipes (id, family_id) on delete cascade,
  constraint recipe_steps_position_ck check (position >= 1),
  constraint recipe_steps_instruction_len_ck check (
    char_length(instruction) >= 1
    and char_length(instruction) <= 5000
  ),
  constraint recipe_steps_duration_minutes_ck check (
    duration_minutes is null
    or (
      duration_minutes >= 0
      and duration_minutes <= 525600
    )
  )
);

comment on table public.recipe_steps is 'Ordered steps for a recipe; media_asset_id FK deferred to T3.1.';

-- ---------------------------------------------------------------------------
-- family_tags
-- ---------------------------------------------------------------------------

create table public.family_tags (
  id uuid primary key default gen_random_uuid (),
  family_id uuid not null references public.families (id) on delete restrict,
  name text not null,
  normalized_name text not null,
  created_by uuid not null references public.profiles (user_id),
  created_at timestamptz not null default now(),
  constraint family_tags_id_family_uniq unique (id, family_id),
  constraint family_tags_family_normalized_uniq unique (family_id, normalized_name),
  constraint family_tags_name_len_ck check (
    char_length(name) >= 1
    and char_length(name) <= 50
  ),
  constraint family_tags_normalized_name_len_ck check (
    char_length(normalized_name) >= 1
    and char_length(normalized_name) <= 50
  )
);

comment on table public.family_tags is 'Tenant-local tag vocabulary.';

create trigger family_tags_normalize_name
before insert or
update on public.family_tags
for each row
execute function private.family_tag_normalize_name ();

-- ---------------------------------------------------------------------------
-- recipe_tags
-- ---------------------------------------------------------------------------

create table public.recipe_tags (
  family_id uuid not null,
  recipe_id uuid not null,
  tag_id uuid not null,
  constraint recipe_tags_pkey primary key (recipe_id, tag_id),
  constraint recipe_tags_recipe_family_fk foreign key (recipe_id, family_id) references public.recipes (id, family_id) on delete cascade,
  constraint recipe_tags_tag_family_fk foreign key (tag_id, family_id) references public.family_tags (id, family_id) on delete restrict
);

comment on table public.recipe_tags is 'Recipe-to-family-tag associations.';

-- ---------------------------------------------------------------------------
-- recipe_translations
-- ---------------------------------------------------------------------------

create table public.recipe_translations (
  id uuid primary key default gen_random_uuid (),
  recipe_id uuid not null,
  family_id uuid not null,
  language_tag text not null,
  title text not null,
  description text null,
  notes text null,
  review_status public.translation_review_status not null default 'unreviewed',
  created_by uuid not null references public.profiles (user_id),
  reviewed_by uuid null references public.profiles (user_id),
  reviewed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recipe_translations_id_family_uniq unique (id, family_id),
  constraint recipe_translations_recipe_language_uniq unique (recipe_id, language_tag),
  constraint recipe_translations_recipe_family_fk foreign key (recipe_id, family_id) references public.recipes (id, family_id) on delete cascade,
  constraint recipe_translations_language_ck check (
    char_length(language_tag) >= 2
    and char_length(language_tag) <= 35
    and language_tag ~ '^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})*$'
  ),
  constraint recipe_translations_title_len_ck check (
    char_length(title) >= 1
    and char_length(title) <= 200
  ),
  constraint recipe_translations_description_len_ck check (
    description is null
    or (
      char_length(description) >= 1
      and char_length(description) <= 5000
    )
  ),
  constraint recipe_translations_notes_len_ck check (
    notes is null
    or (
      char_length(notes) >= 1
      and char_length(notes) <= 10000
    )
  )
);

comment on table public.recipe_translations is 'Manual recipe translations; original row unchanged.';

create trigger recipe_translations_set_updated_at
before update on public.recipe_translations
for each row
execute function public.set_updated_at ();

-- ---------------------------------------------------------------------------
-- recipe_ingredient_translations
-- ---------------------------------------------------------------------------

create table public.recipe_ingredient_translations (
  id uuid primary key default gen_random_uuid (),
  ingredient_id uuid not null references public.recipe_ingredients (id) on delete cascade,
  family_id uuid not null,
  language_tag text not null,
  name text not null,
  notes text null,
  constraint recipe_ingredient_translations_ingredient_language_uniq unique (ingredient_id, language_tag),
  constraint recipe_ingredient_translations_ingredient_family_fk foreign key (ingredient_id, family_id) references public.recipe_ingredients (id, family_id) on delete cascade,
  constraint recipe_ingredient_translations_language_ck check (
    char_length(language_tag) >= 2
    and char_length(language_tag) <= 35
    and language_tag ~ '^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})*$'
  ),
  constraint recipe_ingredient_translations_name_len_ck check (
    char_length(name) >= 1
    and char_length(name) <= 200
  ),
  constraint recipe_ingredient_translations_notes_len_ck check (
    notes is null
    or (
      char_length(notes) >= 1
      and char_length(notes) <= 500
    )
  )
);

-- ---------------------------------------------------------------------------
-- recipe_step_translations
-- ---------------------------------------------------------------------------

create table public.recipe_step_translations (
  id uuid primary key default gen_random_uuid (),
  step_id uuid not null references public.recipe_steps (id) on delete cascade,
  family_id uuid not null,
  language_tag text not null,
  instruction text not null,
  constraint recipe_step_translations_step_language_uniq unique (step_id, language_tag),
  constraint recipe_step_translations_step_family_fk foreign key (step_id, family_id) references public.recipe_steps (id, family_id) on delete cascade,
  constraint recipe_step_translations_language_ck check (
    char_length(language_tag) >= 2
    and char_length(language_tag) <= 35
    and language_tag ~ '^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})*$'
  ),
  constraint recipe_step_translations_instruction_len_ck check (
    char_length(instruction) >= 1
    and char_length(instruction) <= 5000
  )
);

-- ---------------------------------------------------------------------------
-- recipe_revisions
-- ---------------------------------------------------------------------------

create table public.recipe_revisions (
  id uuid primary key default gen_random_uuid (),
  family_id uuid not null,
  recipe_id uuid not null,
  version integer not null,
  changed_by uuid not null references public.profiles (user_id),
  change_summary text null,
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  constraint recipe_revisions_recipe_version_uniq unique (recipe_id, version),
  constraint recipe_revisions_recipe_family_fk foreign key (recipe_id, family_id) references public.recipes (id, family_id) on delete cascade,
  constraint recipe_revisions_version_ck check (version >= 1),
  constraint recipe_revisions_change_summary_len_ck check (
    change_summary is null
    or (
      char_length(change_summary) >= 1
      and char_length(change_summary) <= 500
    )
  )
);

create index recipe_revisions_recipe_id_version_idx on public.recipe_revisions (recipe_id, version desc);

comment on table public.recipe_revisions is 'Immutable revision snapshots after successful mutations.';

-- ---------------------------------------------------------------------------
-- audit_events
-- ---------------------------------------------------------------------------

create table public.audit_events (
  id uuid primary key default gen_random_uuid (),
  family_id uuid not null references public.families (id) on delete restrict,
  actor_user_id uuid null references public.profiles (user_id),
  event_type text not null,
  entity_type text not null,
  entity_id uuid null,
  client_id text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint audit_events_event_type_len_ck check (
    char_length(event_type) >= 1
    and char_length(event_type) <= 120
  ),
  constraint audit_events_entity_type_len_ck check (
    char_length(entity_type) >= 1
    and char_length(entity_type) <= 120
  ),
  constraint audit_events_client_id_len_ck check (
    client_id is null
    or (
      char_length(client_id) >= 1
      and char_length(client_id) <= 256
    )
  )
);

create index audit_events_family_id_created_at_idx on public.audit_events (family_id, created_at desc);

comment on table public.audit_events is 'Append-only security-relevant audit trail.';

-- ---------------------------------------------------------------------------
-- private: recipe ACL helpers
-- ---------------------------------------------------------------------------

create or replace function private.can_create_recipe (p_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    private.is_active_member (p_family_id)
    and private.family_role (p_family_id) is not null
    and private.family_role (p_family_id) <> 'viewer';
$$;

create or replace function private.can_edit_recipe (p_family_id uuid, p_created_by uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    private.is_active_member (p_family_id)
    and (
      private.has_family_role (
        p_family_id,
        array['owner', 'admin', 'editor']::public.family_role[]
      )
      or (
        private.family_role (p_family_id) = 'contributor'
        and p_created_by = auth.uid ()
      )
    );
$$;

create or replace function private.can_manage_recipe_tags (p_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    private.has_family_role (
      p_family_id,
      array['owner', 'admin', 'editor']::public.family_role[]
    );
$$;

create or replace function private.can_view_recipe_history (p_family_id uuid, p_created_by uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    private.is_active_member (p_family_id)
    and private.family_role (p_family_id) is not null
    and private.family_role (p_family_id) <> 'viewer'
    and (
      private.has_family_role (
        p_family_id,
        array['owner', 'admin', 'editor']::public.family_role[]
      )
      or (
        private.family_role (p_family_id) = 'contributor'
        and p_created_by = auth.uid ()
      )
    );
$$;

create or replace function private.can_view_audit_events (p_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    private.has_family_role (
      p_family_id,
      array['owner', 'admin', 'editor']::public.family_role[]
    );
$$;

revoke all on function private.can_create_recipe (uuid) from public;

revoke all on function private.can_edit_recipe (uuid, uuid) from public;

revoke all on function private.can_manage_recipe_tags (uuid) from public;

revoke all on function private.can_view_recipe_history (uuid, uuid) from public;

revoke all on function private.can_view_audit_events (uuid) from public;

grant execute on function private.can_create_recipe (uuid) to authenticated;

grant execute on function private.can_edit_recipe (uuid, uuid) to authenticated;

grant execute on function private.can_manage_recipe_tags (uuid) to authenticated;

grant execute on function private.can_view_recipe_history (uuid, uuid) to authenticated;

grant execute on function private.can_view_audit_events (uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Identity / append-only guards (apply even when table owner bypasses RLS)
-- ---------------------------------------------------------------------------

create or replace function private.reject_family_id_change ()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if new.family_id is distinct from old.family_id then
    raise exception 'family_id cannot be changed' using errcode = '42501';
  end if;
  return new;
end;
$$;

create or replace function private.recipes_guard_identity ()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if new.id is distinct from old.id
    or new.family_id is distinct from old.family_id
    or new.created_by is distinct from old.created_by
  then
    raise exception 'recipe identity cannot be changed' using errcode = '42501';
  end if;
  return new;
end;
$$;

create or replace function private.reject_updates ()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  raise exception 'append-only table cannot be updated' using errcode = '42501';
end;
$$;

revoke all on function private.reject_family_id_change () from public;

revoke all on function private.recipes_guard_identity () from public;

revoke all on function private.reject_updates () from public;

grant execute on function private.reject_family_id_change () to authenticated;

grant execute on function private.recipes_guard_identity () to authenticated;

grant execute on function private.reject_updates () to authenticated;

create trigger recipes_guard_identity
before update on public.recipes
for each row
execute function private.recipes_guard_identity ();

create trigger recipe_ingredients_reject_family_id_change
before update on public.recipe_ingredients
for each row
execute function private.reject_family_id_change ();

create trigger recipe_steps_reject_family_id_change
before update on public.recipe_steps
for each row
execute function private.reject_family_id_change ();

create trigger family_tags_reject_family_id_change
before update on public.family_tags
for each row
execute function private.reject_family_id_change ();

create trigger recipe_tags_reject_family_id_change
before update on public.recipe_tags
for each row
execute function private.reject_family_id_change ();

create trigger recipe_translations_reject_family_id_change
before update on public.recipe_translations
for each row
execute function private.reject_family_id_change ();

create trigger recipe_ingredient_translations_reject_family_id_change
before update on public.recipe_ingredient_translations
for each row
execute function private.reject_family_id_change ();

create trigger recipe_step_translations_reject_family_id_change
before update on public.recipe_step_translations
for each row
execute function private.reject_family_id_change ();

create trigger recipe_revisions_reject_updates
before update on public.recipe_revisions
for each row
execute function private.reject_updates ();

create trigger audit_events_reject_updates
before update on public.audit_events
for each row
execute function private.reject_updates ();

-- ---------------------------------------------------------------------------
-- Row level security: recipes
-- ---------------------------------------------------------------------------

alter table public.recipes enable row level security;

create policy "recipes_select_active_member"
  on public.recipes
  for select
  to authenticated
  using (private.is_active_member (family_id));

create policy "recipes_insert_creator_roles"
  on public.recipes
  for insert
  to authenticated
  with check (
    private.can_create_recipe (family_id)
    and created_by = auth.uid ()
    and updated_by = auth.uid ()
  );

create policy "recipes_update_authorized"
  on public.recipes
  for update
  to authenticated
  using (private.can_edit_recipe (family_id, created_by))
  with check (
    private.can_edit_recipe (family_id, created_by)
    and family_id = (
      select
        r.family_id
      from
        public.recipes r
      where
        r.id = recipes.id
    )
    and created_by = (
      select
        r.created_by
      from
        public.recipes r
      where
        r.id = recipes.id
    )
    and updated_by = auth.uid ()
  );

-- ---------------------------------------------------------------------------
-- Row level security: recipe_ingredients
-- ---------------------------------------------------------------------------

alter table public.recipe_ingredients enable row level security;

create policy "recipe_ingredients_select_active_member"
  on public.recipe_ingredients
  for select
  to authenticated
  using (private.is_active_member (family_id));

create policy "recipe_ingredients_insert_editor"
  on public.recipe_ingredients
  for insert
  to authenticated
  with check (
    exists (
      select
        1
      from
        public.recipes r
      where
        r.id = recipe_ingredients.recipe_id
        and r.family_id = recipe_ingredients.family_id
        and private.can_edit_recipe (r.family_id, r.created_by)
    )
  );

create policy "recipe_ingredients_update_editor"
  on public.recipe_ingredients
  for update
  to authenticated
  using (
    exists (
      select
        1
      from
        public.recipes r
      where
        r.id = recipe_ingredients.recipe_id
        and r.family_id = recipe_ingredients.family_id
        and private.can_edit_recipe (r.family_id, r.created_by)
    )
  )
  with check (
    exists (
      select
        1
      from
        public.recipes r
      where
        r.id = recipe_ingredients.recipe_id
        and r.family_id = recipe_ingredients.family_id
        and private.can_edit_recipe (r.family_id, r.created_by)
    )
  );

-- ---------------------------------------------------------------------------
-- Row level security: recipe_steps
-- ---------------------------------------------------------------------------

alter table public.recipe_steps enable row level security;

create policy "recipe_steps_select_active_member"
  on public.recipe_steps
  for select
  to authenticated
  using (private.is_active_member (family_id));

create policy "recipe_steps_insert_editor"
  on public.recipe_steps
  for insert
  to authenticated
  with check (
    exists (
      select
        1
      from
        public.recipes r
      where
        r.id = recipe_steps.recipe_id
        and r.family_id = recipe_steps.family_id
        and private.can_edit_recipe (r.family_id, r.created_by)
    )
  );

create policy "recipe_steps_update_editor"
  on public.recipe_steps
  for update
  to authenticated
  using (
    exists (
      select
        1
      from
        public.recipes r
      where
        r.id = recipe_steps.recipe_id
        and r.family_id = recipe_steps.family_id
        and private.can_edit_recipe (r.family_id, r.created_by)
    )
  )
  with check (
    exists (
      select
        1
      from
        public.recipes r
      where
        r.id = recipe_steps.recipe_id
        and r.family_id = recipe_steps.family_id
        and private.can_edit_recipe (r.family_id, r.created_by)
    )
  );

-- ---------------------------------------------------------------------------
-- Row level security: family_tags
-- ---------------------------------------------------------------------------

alter table public.family_tags enable row level security;

create policy "family_tags_select_active_member"
  on public.family_tags
  for select
  to authenticated
  using (private.is_active_member (family_id));

create policy "family_tags_insert_managers"
  on public.family_tags
  for insert
  to authenticated
  with check (
    private.can_manage_recipe_tags (family_id)
    and created_by = auth.uid ()
  );

create policy "family_tags_update_managers"
  on public.family_tags
  for update
  to authenticated
  using (private.can_manage_recipe_tags (family_id))
  with check (
    private.can_manage_recipe_tags (family_id)
    and family_id = (
      select
        ft.family_id
      from
        public.family_tags ft
      where
        ft.id = family_tags.id
    )
    and created_by = (
      select
        ft.created_by
      from
        public.family_tags ft
      where
        ft.id = family_tags.id
    )
  );

-- ---------------------------------------------------------------------------
-- Row level security: recipe_tags
-- ---------------------------------------------------------------------------

alter table public.recipe_tags enable row level security;

create policy "recipe_tags_select_active_member"
  on public.recipe_tags
  for select
  to authenticated
  using (private.is_active_member (family_id));

create policy "recipe_tags_insert_editor"
  on public.recipe_tags
  for insert
  to authenticated
  with check (
    exists (
      select
        1
      from
        public.recipes r
      where
        r.id = recipe_tags.recipe_id
        and r.family_id = recipe_tags.family_id
        and private.can_edit_recipe (r.family_id, r.created_by)
    )
  );

create policy "recipe_tags_update_editor"
  on public.recipe_tags
  for update
  to authenticated
  using (
    exists (
      select
        1
      from
        public.recipes r
      where
        r.id = recipe_tags.recipe_id
        and r.family_id = recipe_tags.family_id
        and private.can_edit_recipe (r.family_id, r.created_by)
    )
  )
  with check (
    exists (
      select
        1
      from
        public.recipes r
      where
        r.id = recipe_tags.recipe_id
        and r.family_id = recipe_tags.family_id
        and private.can_edit_recipe (r.family_id, r.created_by)
    )
  );

-- ---------------------------------------------------------------------------
-- Row level security: recipe_translations
-- ---------------------------------------------------------------------------

alter table public.recipe_translations enable row level security;

create policy "recipe_translations_select_active_member"
  on public.recipe_translations
  for select
  to authenticated
  using (private.is_active_member (family_id));

create policy "recipe_translations_insert_editor"
  on public.recipe_translations
  for insert
  to authenticated
  with check (
    exists (
      select
        1
      from
        public.recipes r
      where
        r.id = recipe_translations.recipe_id
        and r.family_id = recipe_translations.family_id
        and private.can_edit_recipe (r.family_id, r.created_by)
    )
    and created_by = auth.uid ()
  );

create policy "recipe_translations_update_editor"
  on public.recipe_translations
  for update
  to authenticated
  using (
    exists (
      select
        1
      from
        public.recipes r
      where
        r.id = recipe_translations.recipe_id
        and r.family_id = recipe_translations.family_id
        and private.can_edit_recipe (r.family_id, r.created_by)
    )
  )
  with check (
    exists (
      select
        1
      from
        public.recipes r
      where
        r.id = recipe_translations.recipe_id
        and r.family_id = recipe_translations.family_id
        and private.can_edit_recipe (r.family_id, r.created_by)
    )
    and created_by = (
      select
        t.created_by
      from
        public.recipe_translations t
      where
        t.id = recipe_translations.id
    )
  );

-- ---------------------------------------------------------------------------
-- Row level security: recipe_ingredient_translations
-- ---------------------------------------------------------------------------

alter table public.recipe_ingredient_translations enable row level security;

create policy "recipe_ingredient_translations_select_active_member"
  on public.recipe_ingredient_translations
  for select
  to authenticated
  using (private.is_active_member (family_id));

create policy "recipe_ingredient_translations_insert_editor"
  on public.recipe_ingredient_translations
  for insert
  to authenticated
  with check (
    exists (
      select
        1
      from
        public.recipe_ingredients i
        join public.recipes r on r.id = i.recipe_id and r.family_id = i.family_id
      where
        i.id = recipe_ingredient_translations.ingredient_id
        and i.family_id = recipe_ingredient_translations.family_id
        and private.can_edit_recipe (r.family_id, r.created_by)
    )
  );

create policy "recipe_ingredient_translations_update_editor"
  on public.recipe_ingredient_translations
  for update
  to authenticated
  using (
    exists (
      select
        1
      from
        public.recipe_ingredients i
        join public.recipes r on r.id = i.recipe_id and r.family_id = i.family_id
      where
        i.id = recipe_ingredient_translations.ingredient_id
        and i.family_id = recipe_ingredient_translations.family_id
        and private.can_edit_recipe (r.family_id, r.created_by)
    )
  )
  with check (
    exists (
      select
        1
      from
        public.recipe_ingredients i
        join public.recipes r on r.id = i.recipe_id and r.family_id = i.family_id
      where
        i.id = recipe_ingredient_translations.ingredient_id
        and i.family_id = recipe_ingredient_translations.family_id
        and private.can_edit_recipe (r.family_id, r.created_by)
    )
  );

-- ---------------------------------------------------------------------------
-- Row level security: recipe_step_translations
-- ---------------------------------------------------------------------------

alter table public.recipe_step_translations enable row level security;

create policy "recipe_step_translations_select_active_member"
  on public.recipe_step_translations
  for select
  to authenticated
  using (private.is_active_member (family_id));

create policy "recipe_step_translations_insert_editor"
  on public.recipe_step_translations
  for insert
  to authenticated
  with check (
    exists (
      select
        1
      from
        public.recipe_steps s
        join public.recipes r on r.id = s.recipe_id and r.family_id = s.family_id
      where
        s.id = recipe_step_translations.step_id
        and s.family_id = recipe_step_translations.family_id
        and private.can_edit_recipe (r.family_id, r.created_by)
    )
  );

create policy "recipe_step_translations_update_editor"
  on public.recipe_step_translations
  for update
  to authenticated
  using (
    exists (
      select
        1
      from
        public.recipe_steps s
        join public.recipes r on r.id = s.recipe_id and r.family_id = s.family_id
      where
        s.id = recipe_step_translations.step_id
        and s.family_id = recipe_step_translations.family_id
        and private.can_edit_recipe (r.family_id, r.created_by)
    )
  )
  with check (
    exists (
      select
        1
      from
        public.recipe_steps s
        join public.recipes r on r.id = s.recipe_id and r.family_id = s.family_id
      where
        s.id = recipe_step_translations.step_id
        and s.family_id = recipe_step_translations.family_id
        and private.can_edit_recipe (r.family_id, r.created_by)
    )
  );

-- ---------------------------------------------------------------------------
-- Row level security: recipe_revisions
-- ---------------------------------------------------------------------------

alter table public.recipe_revisions enable row level security;

create policy "recipe_revisions_select_history"
  on public.recipe_revisions
  for select
  to authenticated
  using (
    exists (
      select
        1
      from
        public.recipes r
      where
        r.id = recipe_revisions.recipe_id
        and r.family_id = recipe_revisions.family_id
        and private.can_view_recipe_history (r.family_id, r.created_by)
    )
  );

create policy "recipe_revisions_insert_editor"
  on public.recipe_revisions
  for insert
  to authenticated
  with check (
    exists (
      select
        1
      from
        public.recipes r
      where
        r.id = recipe_revisions.recipe_id
        and r.family_id = recipe_revisions.family_id
        and private.can_edit_recipe (r.family_id, r.created_by)
    )
    and changed_by = auth.uid ()
  );

-- ---------------------------------------------------------------------------
-- Row level security: audit_events
-- ---------------------------------------------------------------------------

alter table public.audit_events enable row level security;

create policy "audit_events_select_managers"
  on public.audit_events
  for select
  to authenticated
  using (private.can_view_audit_events (family_id));

create policy "audit_events_insert_member"
  on public.audit_events
  for insert
  to authenticated
  with check (
    private.can_create_recipe (family_id)
    and actor_user_id = auth.uid ()
  );

-- ---------------------------------------------------------------------------
-- Table privileges (auto_expose_new_tables = false)
-- ---------------------------------------------------------------------------

revoke all on table public.recipes from public, anon, authenticated;

grant
select,
insert,
update on table public.recipes to authenticated;

revoke all on table public.recipe_ingredients from public, anon, authenticated;

grant
select,
insert,
update on table public.recipe_ingredients to authenticated;

revoke all on table public.recipe_steps from public, anon, authenticated;

grant
select,
insert,
update on table public.recipe_steps to authenticated;

revoke all on table public.family_tags from public, anon, authenticated;

grant
select,
insert,
update on table public.family_tags to authenticated;

revoke all on table public.recipe_tags from public, anon, authenticated;

grant
select,
insert,
update on table public.recipe_tags to authenticated;

revoke all on table public.recipe_translations from public, anon, authenticated;

grant
select,
insert,
update on table public.recipe_translations to authenticated;

revoke all on table public.recipe_ingredient_translations from public, anon, authenticated;

grant
select,
insert,
update on table public.recipe_ingredient_translations to authenticated;

revoke all on table public.recipe_step_translations from public, anon, authenticated;

grant
select,
insert,
update on table public.recipe_step_translations to authenticated;

revoke all on table public.recipe_revisions from public, anon, authenticated;

grant
select,
insert on table public.recipe_revisions to authenticated;

revoke all on table public.audit_events from public, anon, authenticated;

grant
select,
insert on table public.audit_events to authenticated;
