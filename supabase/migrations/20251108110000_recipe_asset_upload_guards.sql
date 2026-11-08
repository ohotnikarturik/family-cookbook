-- T3.1 corrective: upload constraints, storage policy qualification, and helper grants.
-- The first asset migration is already applied locally, so these fixes are additive.

alter table public.recipe_assets
drop constraint recipe_assets_byte_size_ck;

alter table public.recipe_assets
drop constraint recipe_assets_checksum_pending_ck;

alter table public.recipe_assets
drop constraint recipe_assets_original_filename_len_ck;

alter table public.recipe_assets
add constraint recipe_assets_bucket_name_ck check (bucket_id = 'family-recipe-media');

alter table public.recipe_assets
add constraint recipe_assets_object_path_shape_ck check (
  object_path = family_id::text || '/' || recipe_id::text || '/' || id::text || '/' || split_part(object_path, '/', 4)
  and split_part(object_path, '/', 4) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and split_part(object_path, '/', 5) = ''
);

alter table public.recipe_assets
add constraint recipe_assets_kind_mime_ck check (
  (
    asset_kind = 'original_document'
    and detected_mime_type = 'application/pdf'
  )
  or (
    asset_kind in ('original_photo', 'recipe_photo', 'step_photo')
    and detected_mime_type in ('image/jpeg', 'image/png', 'image/webp')
  )
);

alter table public.recipe_assets
add constraint recipe_assets_byte_size_for_mime_ck check (
  byte_size >= 0
  and (
    (
      detected_mime_type = 'application/pdf'
      and byte_size <= 26214400
    )
    or (
      detected_mime_type in ('image/jpeg', 'image/png', 'image/webp')
      and byte_size <= 15728640
    )
  )
);

alter table public.recipe_assets
add constraint recipe_assets_checksum_when_available_ck check (
  processing_status <> 'available'
  or (
    char_length(checksum_sha256) = 64
    and checksum_sha256 ~ '^[0-9a-f]{64}$'
    and byte_size >= 1
    and available_at is not null
  )
);

alter table public.recipe_assets
add constraint recipe_assets_original_filename_safe_ck check (
  original_filename is null
  or (
    char_length(original_filename) between 1 and 256
    and original_filename !~ '[[:cntrl:]\\/]'
  )
);

create or replace function private.enforce_recipe_asset_limit ()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  perform
    1
  from
    public.recipes r
  where
    r.id = new.recipe_id
    and r.family_id = new.family_id
  for update;

  if private.recipe_asset_count (new.recipe_id, new.family_id) >= 10 then
    raise exception 'recipe asset limit exceeded' using errcode = '23514';
  end if;
  return new;
end;
$$;

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
  if new.uploaded_by is distinct from old.uploaded_by then
    raise exception 'uploaded_by is immutable' using errcode = '23514';
  end if;
  if new.asset_kind is distinct from old.asset_kind then
    raise exception 'asset_kind is immutable' using errcode = '23514';
  end if;
  return new;
end;
$$;

create or replace function private.recipe_asset_object_exists (p_bucket_id text, p_object_path text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, storage
as $$
  select
    exists (
      select
        1
      from
        storage.objects o
      where
        o.bucket_id = p_bucket_id
        and o.name = p_object_path
        and o.archived_at is null
    );
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

revoke all on function private.recipe_asset_count (uuid, uuid) from public, authenticated;

revoke all on function private.recipe_asset_object_exists (text, text) from public;

grant execute on function private.storage_recipe_asset_family_id (text) to authenticated;

grant execute on function private.recipe_asset_object_exists (text, text) to authenticated;

drop policy "recipe_assets_select_member_available" on public.recipe_assets;

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
        and (
          uploaded_by = auth.uid ()
          or private.has_family_role (
            family_id,
            array['owner', 'admin', 'editor']::public.family_role[]
          )
        )
      )
    )
  );

drop policy "recipe_assets_update_finalize" on public.recipe_assets;

create policy "recipe_assets_update_finalize"
  on public.recipe_assets
  for update
  to authenticated
  using (
    processing_status = 'pending'
    and private.can_finalize_recipe_asset (id, family_id)
  )
  with check (
    private.can_finalize_recipe_asset (id, family_id)
    and (
      processing_status = 'rejected'
      or (
        processing_status = 'available'
        and private.recipe_asset_object_exists (bucket_id, object_path)
        and available_at is not null
        and checksum_sha256 ~ '^[0-9a-f]{64}$'
        and (
          (
            detected_mime_type = 'application/pdf'
            and byte_size between 1 and 26214400
          )
          or (
            detected_mime_type in ('image/jpeg', 'image/png', 'image/webp')
            and byte_size between 1 and 15728640
          )
        )
      )
    )
  );

drop policy "recipe_media_storage_insert_pending" on storage.objects;

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
        ra.object_path = storage.objects.name
        and ra.bucket_id = storage.objects.bucket_id
        and ra.processing_status = 'pending'
        and ra.uploaded_by = auth.uid ()
        and ra.family_id = private.storage_recipe_asset_family_id (storage.objects.name)
        and private.is_active_member (ra.family_id)
    )
  );

drop policy "recipe_media_storage_select_member" on storage.objects;

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
        ra.object_path = storage.objects.name
        and ra.bucket_id = storage.objects.bucket_id
        and (
          ra.processing_status = 'available'
          or (
            ra.processing_status = 'pending'
            and (
              ra.uploaded_by = auth.uid ()
              or private.has_family_role (
                ra.family_id,
                array['owner', 'admin', 'editor']::public.family_role[]
              )
            )
          )
        )
    )
  );
