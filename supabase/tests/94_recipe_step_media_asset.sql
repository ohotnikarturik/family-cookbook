begin;

select plan (10);

create temp table w35_step_media (
  recipe_id uuid,
  other_recipe_id uuid,
  step_asset_id uuid,
  dish_asset_id uuid,
  foreign_asset_id uuid,
  pending_asset_id uuid
);

insert into w35_step_media (
  step_asset_id,
  dish_asset_id,
  foreign_asset_id,
  pending_asset_id
)
values (
  'dddddddd-dddd-4ddd-8ddd-dddddddd0001'::uuid,
  'dddddddd-dddd-4ddd-8ddd-dddddddd0002'::uuid,
  'dddddddd-dddd-4ddd-8ddd-dddddddd0003'::uuid,
  'dddddddd-dddd-4ddd-8ddd-dddddddd0004'::uuid
);

grant all on table w35_step_media to authenticated;

select tests.request_as_user ('11111111-1111-4111-8111-111111111102');

update w35_step_media
set
  recipe_id = (
    public.create_recipe_aggregate(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
      jsonb_build_object(
        'title',
        'Step photo host',
        'sourceLanguage',
        'en',
        'ingredients',
        '[]'::jsonb,
        'steps',
        jsonb_build_array(jsonb_build_object('position', 1, 'instruction', 'Mix')),
        'tags',
        '[]'::jsonb,
        'translations',
        '[]'::jsonb,
        'ingredientTranslations',
        '[]'::jsonb,
        'stepTranslations',
        '[]'::jsonb
      )
    ) ->> 'recipe_id'
  )::uuid;

update w35_step_media
set
  other_recipe_id = (
    public.create_recipe_aggregate(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
      jsonb_build_object(
        'title',
        'Other recipe',
        'sourceLanguage',
        'en',
        'ingredients',
        '[]'::jsonb,
        'steps',
        jsonb_build_array(jsonb_build_object('position', 1, 'instruction', 'Wait')),
        'tags',
        '[]'::jsonb,
        'translations',
        '[]'::jsonb,
        'ingredientTranslations',
        '[]'::jsonb,
        'stepTranslations',
        '[]'::jsonb
      )
    ) ->> 'recipe_id'
  )::uuid;

reset role;

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
  checksum_sha256,
  processing_status,
  available_at
)
select
  step_asset_id,
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
  recipe_id,
  '11111111-1111-4111-8111-111111111102'::uuid,
  'family-recipe-media',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/' || recipe_id::text || '/' || step_asset_id::text || '/dddddddd-dddd-4ddd-8ddd-dddddddd00aa',
  'step_photo',
  'image/jpeg',
  128,
  repeat('ab', 32),
  'available',
  now()
from
  w35_step_media;

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
  checksum_sha256,
  processing_status,
  available_at
)
select
  dish_asset_id,
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
  recipe_id,
  '11111111-1111-4111-8111-111111111102'::uuid,
  'family-recipe-media',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/' || recipe_id::text || '/' || dish_asset_id::text || '/dddddddd-dddd-4ddd-8ddd-dddddddd00bb',
  'recipe_photo',
  'image/jpeg',
  128,
  repeat('cd', 32),
  'available',
  now()
from
  w35_step_media;

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
  checksum_sha256,
  processing_status,
  available_at
)
select
  foreign_asset_id,
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
  other_recipe_id,
  '11111111-1111-4111-8111-111111111102'::uuid,
  'family-recipe-media',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/' || other_recipe_id::text || '/' || foreign_asset_id::text || '/dddddddd-dddd-4ddd-8ddd-dddddddd00cc',
  'step_photo',
  'image/png',
  64,
  repeat('ef', 32),
  'available',
  now()
from
  w35_step_media;

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
select
  pending_asset_id,
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
  recipe_id,
  '11111111-1111-4111-8111-111111111102'::uuid,
  'family-recipe-media',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/' || recipe_id::text || '/' || pending_asset_id::text || '/dddddddd-dddd-4ddd-8ddd-dddddddd00dd',
  'step_photo',
  'image/jpeg',
  0,
  'pending'
from
  w35_step_media;

select tests.request_as_user ('11111111-1111-4111-8111-111111111102');

select
  lives_ok (
    $$
      select public.update_recipe_aggregate(
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
        (select recipe_id from w35_step_media),
        1,
        jsonb_build_object(
          'title',
          'Step photo host',
          'sourceLanguage',
          'en',
          'ingredients',
          '[]'::jsonb,
          'steps',
          jsonb_build_array(
            jsonb_build_object(
              'position',
              1,
              'instruction',
              'Mix',
              'mediaAssetId',
              'dddddddd-dddd-4ddd-8ddd-dddddddd0001'
            )
          ),
          'tags',
          '[]'::jsonb,
          'translations',
          '[]'::jsonb,
          'ingredientTranslations',
          '[]'::jsonb,
          'stepTranslations',
          '[]'::jsonb
        )
      )
    $$,
    'editor can save a step linked to an available step photo'
  );

select
  is (
    (
      select
        s.media_asset_id
      from
        public.recipe_steps s
      where
        s.recipe_id = (
          select
            recipe_id
          from
            w35_step_media
        )
        and s.position = 1
    ),
    'dddddddd-dddd-4ddd-8ddd-dddddddd0001'::uuid,
    'saved step keeps the step photo id'
  );

select
  is (
    (
      select
        rev.snapshot -> 'steps' -> 0 ->> 'media_asset_id'
      from
        public.recipe_revisions rev
      where
        rev.recipe_id = (
          select
            recipe_id
          from
            w35_step_media
        )
        and rev.version = 2
    ),
    'dddddddd-dddd-4ddd-8ddd-dddddddd0001',
    'revision snapshot includes the step photo id'
  );

select
  throws_ok (
    $$
      select public.update_recipe_aggregate(
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
        (select recipe_id from w35_step_media),
        2,
        jsonb_build_object(
          'title',
          'Step photo host',
          'sourceLanguage',
          'en',
          'ingredients',
          '[]'::jsonb,
          'steps',
          jsonb_build_array(
            jsonb_build_object(
              'position',
              1,
              'instruction',
              'Mix',
              'mediaAssetId',
              'dddddddd-dddd-4ddd-8ddd-dddddddd0003'
            )
          ),
          'tags',
          '[]'::jsonb,
          'translations',
          '[]'::jsonb,
          'ingredientTranslations',
          '[]'::jsonb,
          'stepTranslations',
          '[]'::jsonb
        )
      )
    $$,
    '22023',
    null,
    'a step cannot link a photo from another recipe'
  );

select
  throws_ok (
    $$
      select public.update_recipe_aggregate(
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
        (select recipe_id from w35_step_media),
        2,
        jsonb_build_object(
          'title',
          'Step photo host',
          'sourceLanguage',
          'en',
          'ingredients',
          '[]'::jsonb,
          'steps',
          jsonb_build_array(
            jsonb_build_object(
              'position',
              1,
              'instruction',
              'Mix',
              'mediaAssetId',
              'dddddddd-dddd-4ddd-8ddd-dddddddd0002'
            )
          ),
          'tags',
          '[]'::jsonb,
          'translations',
          '[]'::jsonb,
          'ingredientTranslations',
          '[]'::jsonb,
          'stepTranslations',
          '[]'::jsonb
        )
      )
    $$,
    '22023',
    null,
    'a step cannot link a recipe photo'
  );

select
  throws_ok (
    $$
      select public.update_recipe_aggregate(
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
        (select recipe_id from w35_step_media),
        2,
        jsonb_build_object(
          'title',
          'Step photo host',
          'sourceLanguage',
          'en',
          'ingredients',
          '[]'::jsonb,
          'steps',
          jsonb_build_array(
            jsonb_build_object(
              'position',
              1,
              'instruction',
              'Mix',
              'mediaAssetId',
              'dddddddd-dddd-4ddd-8ddd-dddddddd0004'
            )
          ),
          'tags',
          '[]'::jsonb,
          'translations',
          '[]'::jsonb,
          'ingredientTranslations',
          '[]'::jsonb,
          'stepTranslations',
          '[]'::jsonb
        )
      )
    $$,
    '22023',
    null,
    'a step cannot link a pending upload'
  );

select
  throws_ok (
    $$
      select public.update_recipe_aggregate(
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
        (select recipe_id from w35_step_media),
        2,
        jsonb_build_object(
          'title',
          'Step photo host',
          'sourceLanguage',
          'en',
          'ingredients',
          '[]'::jsonb,
          'steps',
          jsonb_build_array(
            jsonb_build_object(
              'position',
              1,
              'instruction',
              'Mix',
              'mediaAssetId',
              'not-a-uuid'
            )
          ),
          'tags',
          '[]'::jsonb,
          'translations',
          '[]'::jsonb,
          'ingredientTranslations',
          '[]'::jsonb,
          'stepTranslations',
          '[]'::jsonb
        )
      )
    $$,
    '22023',
    null,
    'a malformed step photo id is rejected'
  );

select
  is (
    (
      select
        r.version
      from
        public.recipes r
      where
        r.id = (
          select
            recipe_id
          from
            w35_step_media
        )
    ),
    2,
    'rejected step photo links do not bump the version'
  );

select
  lives_ok (
    $$
      select public.update_recipe_aggregate(
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
        (select recipe_id from w35_step_media),
        2,
        jsonb_build_object(
          'title',
          'Step photo host',
          'sourceLanguage',
          'en',
          'ingredients',
          '[]'::jsonb,
          'steps',
          jsonb_build_array(jsonb_build_object('position', 1, 'instruction', 'Mix')),
          'tags',
          '[]'::jsonb,
          'translations',
          '[]'::jsonb,
          'ingredientTranslations',
          '[]'::jsonb,
          'stepTranslations',
          '[]'::jsonb
        )
      )
    $$,
    'omitting mediaAssetId clears the step link'
  );

select
  is (
    (
      select
        s.media_asset_id
      from
        public.recipe_steps s
      where
        s.recipe_id = (
          select
            recipe_id
          from
            w35_step_media
        )
        and s.position = 1
    ),
    null::uuid,
    'cleared step has no photo id'
  );

select finish ();

rollback;
