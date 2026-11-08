begin;

select plan (19);

reset role;

select tests.request_as_user ('11111111-1111-4111-8111-111111111103');

select
  throws_ok (
    $$
      insert into public.recipe_assets (
        id,
        family_id,
        recipe_id,
        uploaded_by,
        bucket_id,
        object_path,
        asset_kind,
        detected_mime_type,
        byte_size,
        processing_status
      )
      values (
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001'::uuid,
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
        'eeeeeeee-eeee-4eee-8eee-eeeeeeee0101'::uuid,
        '11111111-1111-4111-8111-111111111103'::uuid,
        'family-recipe-media',
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/eeeeeeee-eeee-4eee-8eee-eeeeeeee0101/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0001',
        'recipe_photo',
        'image/jpeg',
        1024,
        'pending'
      )
    $$,
    '42501',
    null,
    'viewer cannot insert recipe asset'
  );

select
  throws_ok (
    $$
      select
        private.recipe_asset_count (
          'eeeeeeee-eeee-4eee-8eee-eeeeeeee0101'::uuid,
          'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
        )
    $$,
    '42501',
    null,
    'members cannot call the asset count helper'
  );

reset role;

select tests.request_as_user ('11111111-1111-4111-8111-111111111104');

select
  lives_ok (
    $$
      insert into public.recipe_assets (
        id,
        family_id,
        recipe_id,
        uploaded_by,
        bucket_id,
        object_path,
        asset_kind,
        original_filename,
        detected_mime_type,
        byte_size,
        processing_status
      )
      values (
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0a01'::uuid,
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
        'eeeeeeee-eeee-4eee-8eee-eeeeeeee0101'::uuid,
        '11111111-1111-4111-8111-111111111104'::uuid,
        'family-recipe-media',
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/eeeeeeee-eeee-4eee-8eee-eeeeeeee0101/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0a01/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0a01',
        'recipe_photo',
        'photo.jpg',
        'image/jpeg',
        4096,
        'pending'
      )
    $$,
    'admin can insert an upload slot'
  );

select
  lives_ok (
    $$
      insert into storage.objects (bucket_id, name, owner_id)
      values (
        'family-recipe-media',
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/eeeeeeee-eeee-4eee-8eee-eeeeeeee0101/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0a01/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0a01',
        '11111111-1111-4111-8111-111111111104'
      )
    $$,
    'uploader can store bytes on the pending object path'
  );

reset role;

select tests.request_as_user ('22222222-2222-4222-8222-222222222202');

select
  throws_ok (
    $$
      insert into public.recipe_assets (
        id,
        family_id,
        recipe_id,
        uploaded_by,
        bucket_id,
        object_path,
        asset_kind,
        detected_mime_type,
        byte_size,
        processing_status
      )
      values (
        'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0b01'::uuid,
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
        'eeeeeeee-eeee-4eee-8eee-eeeeeeee0101'::uuid,
        '22222222-2222-4222-8222-222222222202'::uuid,
        'family-recipe-media',
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/eeeeeeee-eeee-4eee-8eee-eeeeeeee0101/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0b01/cccccccc-cccc-4ccc-8ccc-cccccccc0b01',
        'recipe_photo',
        'image/jpeg',
        1024,
        'pending'
      )
    $$,
    '42501',
    null,
    'contributor B cannot attach to family A recipe'
  );

reset role;

select tests.request_as_user ('22222222-2222-4222-8222-222222222201');

select
  lives_ok (
    $$
      insert into public.recipe_assets (
        id,
        family_id,
        recipe_id,
        uploaded_by,
        bucket_id,
        object_path,
        asset_kind,
        detected_mime_type,
        byte_size,
        processing_status
      )
      values (
        'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0201'::uuid,
        'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid,
        'eeeeeeee-eeee-4eee-8eee-eeeeeeee0201'::uuid,
        '22222222-2222-4222-8222-222222222201'::uuid,
        'family-recipe-media',
        'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/eeeeeeee-eeee-4eee-8eee-eeeeeeee0201/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0201/cccccccc-cccc-4ccc-8ccc-cccccccc0201',
        'recipe_photo',
        'image/jpeg',
        2048,
        'pending'
      )
    $$,
    'owner B can insert an asset in family B'
  );

reset role;

select tests.request_as_user ('11111111-1111-4111-8111-111111111101');

select
  is_empty (
    $$
      select
        1
      from
        public.recipe_assets
      where
        family_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid
    $$,
    'owner A cannot read family B assets'
  );

reset role;

select tests.request_as_user ('11111111-1111-4111-8111-111111111103');

select
  is_empty (
    $$
      select
        1
      from
        public.recipe_assets
      where
        id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0a01'::uuid
    $$,
    'viewer cannot read another members pending asset'
  );

reset role;

select tests.request_as_user ('11111111-1111-4111-8111-111111111102');

select
  lives_ok (
    $$
      do $block$
      declare
        i integer;
        v_id uuid;
        v_file uuid;
      begin
        for i in 1..9 loop
          v_id := gen_random_uuid ();
          v_file := gen_random_uuid ();
          insert into public.recipe_assets (
            id,
            family_id,
            recipe_id,
            uploaded_by,
            bucket_id,
            object_path,
            asset_kind,
            detected_mime_type,
            byte_size,
            processing_status
          )
          values (
            v_id,
            'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
            'eeeeeeee-eeee-4eee-8eee-eeeeeeee0101'::uuid,
            '11111111-1111-4111-8111-111111111102'::uuid,
            'family-recipe-media',
            format(
              'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/eeeeeeee-eeee-4eee-8eee-eeeeeeee0101/%s/%s',
              v_id,
              v_file
            ),
            'recipe_photo',
            'image/jpeg',
            100,
            'pending'
          );
        end loop;
      end
      $block$
    $$,
    'editor can add assets up to the recipe limit'
  );

select
  throws_ok (
    $$
      insert into public.recipe_assets (
        id,
        family_id,
        recipe_id,
        uploaded_by,
        bucket_id,
        object_path,
        asset_kind,
        detected_mime_type,
        byte_size,
        processing_status
      )
      values (
        'cccccccc-cccc-4ccc-8ccc-cccccccc0101'::uuid,
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
        'eeeeeeee-eeee-4eee-8eee-eeeeeeee0102'::uuid,
        '11111111-1111-4111-8111-111111111102'::uuid,
        'family-recipe-media',
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/eeeeeeee-eeee-4eee-8eee-eeeeeeee0102/cccccccc-cccc-4ccc-8ccc-cccccccc0101/dddddddd-dddd-4ddd-8ddd-dddddddd0101',
        'recipe_photo',
        'image/jpeg',
        15728641,
        'pending'
      )
    $$,
    '23514',
    null,
    'jpeg larger than 15 MiB is rejected'
  );

select
  throws_ok (
    $$
      insert into public.recipe_assets (
        id,
        family_id,
        recipe_id,
        uploaded_by,
        bucket_id,
        object_path,
        asset_kind,
        detected_mime_type,
        byte_size,
        processing_status
      )
      values (
        'cccccccc-cccc-4ccc-8ccc-cccccccc0102'::uuid,
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
        'eeeeeeee-eeee-4eee-8eee-eeeeeeee0101'::uuid,
        '11111111-1111-4111-8111-111111111102'::uuid,
        'family-recipe-media',
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/eeeeeeee-eeee-4eee-8eee-eeeeeeee0101/cccccccc-cccc-4ccc-8ccc-cccccccc0102/dddddddd-dddd-4ddd-8ddd-dddddddd0102',
        'recipe_photo',
        'image/jpeg',
        100,
        'pending'
      )
    $$,
    '23514',
    'recipe asset limit exceeded',
    '11th non-rejected asset insert is rejected'
  );

reset role;

select tests.request_as_user ('11111111-1111-4111-8111-111111111104');

select
  lives_ok (
    $$
      update public.recipe_assets
      set
        processing_status = 'rejected'
      where
        id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0a01'::uuid
    $$,
    'pending slot can be marked rejected without a checksum'
  );

reset role;

select tests.request_as_user ('11111111-1111-4111-8111-111111111103');

select
  is_empty (
    $$
      select
        1
      from
        public.recipe_assets
      where
        id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0a01'::uuid
    $$,
    'viewer cannot read another members rejected asset'
  );

reset role;

select tests.request_as_user ('11111111-1111-4111-8111-111111111104');

update public.recipe_assets
set
  processing_status = 'available',
  detected_mime_type = 'image/jpeg',
  byte_size = 4096,
  checksum_sha256 = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  available_at = now()
where
  id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0a01'::uuid;

select
  results_eq (
    $$
      select
        processing_status::text
      from
        public.recipe_assets
      where
        id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0a01'::uuid
    $$,
    array['rejected'::text],
    'rejected slot cannot be marked available'
  );

select
  lives_ok (
    $$
      insert into public.recipe_assets (
        id,
        family_id,
        recipe_id,
        uploaded_by,
        bucket_id,
        object_path,
        asset_kind,
        detected_mime_type,
        byte_size,
        processing_status
      )
      values (
        'dddddddd-dddd-4ddd-8ddd-dddddddd0102'::uuid,
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
        'eeeeeeee-eeee-4eee-8eee-eeeeeeee0102'::uuid,
        '11111111-1111-4111-8111-111111111104'::uuid,
        'family-recipe-media',
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/eeeeeeee-eeee-4eee-8eee-eeeeeeee0102/dddddddd-dddd-4ddd-8ddd-dddddddd0102/eeeeeeee-eeee-4eee-8eee-eeeeeeee0f02',
        'recipe_photo',
        'image/jpeg',
        128,
        'pending'
      )
    $$,
    'admin can open a second recipe slot'
  );

select
  throws_ok (
    $$
      update public.recipe_assets
      set
        processing_status = 'available',
        detected_mime_type = 'image/jpeg',
        byte_size = 128,
        checksum_sha256 = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        available_at = now()
      where
        id = 'dddddddd-dddd-4ddd-8ddd-dddddddd0102'::uuid
    $$,
    '42501',
    null,
    'available is refused when no storage object exists'
  );

select
  lives_ok (
    $$
      insert into public.recipe_assets (
        id,
        family_id,
        recipe_id,
        uploaded_by,
        bucket_id,
        object_path,
        asset_kind,
        detected_mime_type,
        byte_size,
        processing_status
      )
      values (
        'ffffffff-ffff-4fff-8fff-ffffffff0102'::uuid,
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
        'eeeeeeee-eeee-4eee-8eee-eeeeeeee0102'::uuid,
        '11111111-1111-4111-8111-111111111104'::uuid,
        'family-recipe-media',
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/eeeeeeee-eeee-4eee-8eee-eeeeeeee0102/ffffffff-ffff-4fff-8fff-ffffffff0102/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0f02',
        'recipe_photo',
        'image/jpeg',
        64,
        'pending'
      )
    $$,
    'admin can open a slot that has an uploaded object'
  );

select
  lives_ok (
    $$
      insert into storage.objects (bucket_id, name, owner_id)
      values (
        'family-recipe-media',
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/eeeeeeee-eeee-4eee-8eee-eeeeeeee0102/ffffffff-ffff-4fff-8fff-ffffffff0102/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0f02',
        '11111111-1111-4111-8111-111111111104'
      )
    $$,
    'uploader can store the second object'
  );

select
  lives_ok (
    $$
      update public.recipe_assets
      set
        processing_status = 'available',
        detected_mime_type = 'image/jpeg',
        byte_size = 64,
        checksum_sha256 = 'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
        available_at = now()
      where
        id = 'ffffffff-ffff-4fff-8fff-ffffffff0102'::uuid
    $$,
    'pending slot with a stored object can become available'
  );

select
  *
from
  finish ();

rollback;
