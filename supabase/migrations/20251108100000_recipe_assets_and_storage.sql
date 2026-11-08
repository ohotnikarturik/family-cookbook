-- T3.1: recipe_assets, private storage bucket, storage RLS

-- ---------------------------------------------------------------------------
-- enums
-- ---------------------------------------------------------------------------

create type public.asset_kind as enum(
  'original_photo',
  'original_document',
  'recipe_photo',
  'step_photo'
);

create type public.asset_status as enum(
  'pending',
  'quarantined',
  'available',
  'rejected'
);

-- ---------------------------------------------------------------------------
-- recipe_assets
-- ---------------------------------------------------------------------------

create table public.recipe_assets (
  id uuid primary key default gen_random_uuid (),
  family_id uuid not null,
  recipe_id uuid not null,
  uploaded_by uuid not null references public.profiles (user_id),
  bucket_id text not null,
  object_path text not null,
  asset_kind public.asset_kind not null,
  original_filename text null,
  detected_mime_type text not null default 'application/octet-stream',
  byte_size bigint not null default 0,
  checksum_sha256 text not null default '',
  processing_status public.asset_status not null default 'pending',
  created_at timestamptz not null default now(),
  available_at timestamptz null,
  constraint recipe_assets_id_family_uniq unique (id, family_id),
  constraint recipe_assets_object_path_uniq unique (object_path),
  constraint recipe_assets_recipe_family_fk foreign key (recipe_id, family_id) references public.recipes (id, family_id) on delete cascade,
  constraint recipe_assets_bucket_id_ck check (
    char_length(bucket_id) >= 1
    and char_length(bucket_id) <= 120
  ),
  constraint recipe_assets_object_path_len_ck check (
    char_length(object_path) >= 1
    and char_length(object_path) <= 512
  ),
  constraint recipe_assets_original_filename_len_ck check (
    original_filename is null
    or (
      char_length(original_filename) >= 1
      and char_length(original_filename) <= 256
    )
  ),
  constraint recipe_assets_detected_mime_len_ck check (
    char_length(detected_mime_type) >= 1
    and char_length(detected_mime_type) <= 120
  ),
  constraint recipe_assets_byte_size_ck check (
    byte_size >= 0
    and byte_size <= 26214400
  ),
  constraint recipe_assets_checksum_pending_ck check (
    processing_status = 'pending'
    or (
      char_length(checksum_sha256) = 64
      and checksum_sha256 ~ '^[0-9a-f]{64}$'
    )
  )
);

create index recipe_assets_recipe_id_status_idx on public.recipe_assets (recipe_id, processing_status);

create index recipe_assets_family_id_idx on public.recipe_assets (family_id);

comment on table public.recipe_assets is 'Private recipe media metadata; binary in storage bucket family-recipe-media.';

-- ---------------------------------------------------------------------------
-- recipe_steps.media_asset_id FK
-- ---------------------------------------------------------------------------

alter table public.recipe_steps
add constraint recipe_steps_media_asset_fk foreign key (media_asset_id, family_id) references public.recipe_assets (id, family_id) on delete set null;

-- ---------------------------------------------------------------------------
-- private: asset helpers
-- ---------------------------------------------------------------------------

create or replace function private.recipe_asset_count (p_recipe_id uuid, p_family_id uuid)
returns integer
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    count(*)::integer
  from
    public.recipe_assets ra
  where
    ra.recipe_id = p_recipe_id
    and ra.family_id = p_family_id
    and ra.processing_status <> 'rejected';
$$;

create or replace function private.enforce_recipe_asset_limit ()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if private.recipe_asset_count (new.recipe_id, new.family_id) >= 10 then
    raise exception 'recipe asset limit exceeded' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger recipe_assets_enforce_limit
before insert on public.recipe_assets
for each row
execute function private.enforce_recipe_asset_limit ();

create or replace function private.recipe_assets_guard_identity ()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.family_id is distinct from old.family_id then
    raise exception 'family_id is immutable' using errcode = '23514';
  end if;
  if new.recipe_id is distinct from old.recipe_id then
    raise exception 'recipe_id is immutable' using errcode = '23514';
  end if;
  if new.object_path is distinct from old.object_path then
    raise exception 'object_path is immutable' using errcode = '23514';
  end if;
  if new.bucket_id is distinct from old.bucket_id then
    raise exception 'bucket_id is immutable' using errcode = '23514';
  end if;
  if new.id is distinct from old.id then
    raise exception 'id is immutable' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger recipe_assets_guard_identity
before update on public.recipe_assets
for each row
execute function private.recipe_assets_guard_identity ();

create or replace function private.storage_recipe_asset_family_id (p_object_path text)
returns uuid
language sql
immutable
as $$
  select
    (nullif(split_part(p_object_path, '/', 1), ''))::uuid;
$$;

create or replace function private.can_finalize_recipe_asset (p_asset_id uuid, p_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    exists (
      select
        1
      from
        public.recipe_assets ra
        join public.recipes r on r.id = ra.recipe_id
        and r.family_id = ra.family_id
      where
        ra.id = p_asset_id
        and ra.family_id = p_family_id
        and ra.processing_status = 'pending'
        and (
          ra.uploaded_by = auth.uid ()
          or private.has_family_role (
            p_family_id,
            array['owner', 'admin', 'editor']::public.family_role[]
          )
        )
        and private.can_edit_recipe (p_family_id, r.created_by)
    );
$$;

revoke all on function private.recipe_asset_count (uuid, uuid) from public;

revoke all on function private.enforce_recipe_asset_limit () from public;

revoke all on function private.recipe_assets_guard_identity () from public;

revoke all on function private.storage_recipe_asset_family_id (text) from public;

revoke all on function private.can_finalize_recipe_asset (uuid, uuid) from public;

grant execute on function private.recipe_asset_count (uuid, uuid) to authenticated;

grant execute on function private.can_finalize_recipe_asset (uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Row level security: recipe_assets
-- ---------------------------------------------------------------------------

alter table public.recipe_assets enable row level security;

create policy "recipe_assets_select_member_available"
  on public.recipe_assets
  for select
  to authenticated
  using (
    private.is_active_member (family_id)
    and (
      processing_status = 'available'
      or (
        processing_status = 'pending'
        and uploaded_by = auth.uid ()
      )
      or private.has_family_role (
        family_id,
        array['owner', 'admin', 'editor']::public.family_role[]
      )
    )
  );

create policy "recipe_assets_insert_editor"
  on public.recipe_assets
  for insert
  to authenticated
  with check (
    uploaded_by = auth.uid ()
    and exists (
      select
        1
      from
        public.recipes r
      where
        r.id = recipe_assets.recipe_id
        and r.family_id = recipe_assets.family_id
        and private.can_edit_recipe (r.family_id, r.created_by)
    )
    and processing_status = 'pending'
    and checksum_sha256 = ''
  );

create policy "recipe_assets_update_finalize"
  on public.recipe_assets
  for update
  to authenticated
  using (
    private.can_finalize_recipe_asset (id, family_id)
  )
  with check (private.can_finalize_recipe_asset (id, family_id));

revoke all on table public.recipe_assets from public, anon, authenticated;

grant
select,
insert,
update on table public.recipe_assets to authenticated;

-- ---------------------------------------------------------------------------
-- storage bucket
-- ---------------------------------------------------------------------------

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'family-recipe-media',
  'family-recipe-media',
  false,
  26214400,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf'
  ]::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- storage.objects policies
-- ---------------------------------------------------------------------------

create policy "recipe_media_storage_insert_pending"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'family-recipe-media'
    and exists (
      select
        1
      from
        public.recipe_assets ra
      where
        ra.object_path = name
        and ra.bucket_id = bucket_id
        and ra.processing_status = 'pending'
        and ra.uploaded_by = auth.uid ()
        and ra.family_id = private.storage_recipe_asset_family_id (name)
        and private.is_active_member (ra.family_id)
    )
  );

create policy "recipe_media_storage_select_member"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'family-recipe-media'
    and private.is_active_member (private.storage_recipe_asset_family_id (name))
    and exists (
      select
        1
      from
        public.recipe_assets ra
      where
        ra.object_path = name
        and ra.bucket_id = bucket_id
        and (
          ra.processing_status = 'available'
          or (
            ra.processing_status = 'pending'
            and ra.uploaded_by = auth.uid ()
          )
          or private.has_family_role (
            ra.family_id,
            array['owner', 'admin', 'editor']::public.family_role[]
          )
        )
    )
  );
