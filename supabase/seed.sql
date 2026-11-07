-- LOCAL DEVELOPMENT ONLY — never run against a hosted Supabase project.
-- Deterministic auth users, profiles, families, and memberships for local tests.
-- Password for all seeded users: see docs/fixtures/TEST_IDENTITIES.md

create extension if not exists pgcrypto;

do $$
declare
  v_password text := crypt('LocalDev-Only-1', gen_salt('bf'));
  rec record;
begin
  for rec in
    select *
    from (
      values
        (
          '11111111-1111-4111-8111-111111111101'::uuid,
          'owner-a@family-cookbook.test',
          'Owner A',
          'en',
          'system'
        ),
        (
          '11111111-1111-4111-8111-111111111102'::uuid,
          'editor-a@family-cookbook.test',
          'Editor A',
          'fi',
          'light'
        ),
        (
          '11111111-1111-4111-8111-111111111103'::uuid,
          'viewer-a@family-cookbook.test',
          'Viewer A',
          'en',
          'dark'
        ),
        (
          '11111111-1111-4111-8111-111111111104'::uuid,
          'admin-a@family-cookbook.test',
          'Admin A',
          'en',
          'system'
        ),
        (
          '22222222-2222-4222-8222-222222222201'::uuid,
          'owner-b@family-cookbook.test',
          'Owner B',
          'en',
          'system'
        ),
        (
          '22222222-2222-4222-8222-222222222202'::uuid,
          'contributor-b@family-cookbook.test',
          'Contributor B',
          'ru',
          'light'
        ),
        (
          '33333333-3333-4333-8333-333333333301'::uuid,
          'multi@family-cookbook.test',
          'Multi Family',
          'uk',
          'system'
        )
    ) as t(user_id, email, display_name, preferred_language, theme_preference)
  loop
    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    )
    values (
      '00000000-0000-0000-0000-000000000000',
      rec.user_id,
      'authenticated',
      'authenticated',
      rec.email,
      v_password,
      now(),
      '',
      '',
      '',
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', rec.display_name),
      now(),
      now()
    );

    insert into auth.identities (
      id,
      user_id,
      provider,
      provider_id,
      identity_data,
      last_sign_in_at,
      created_at,
      updated_at
    )
    values (
      rec.user_id,
      rec.user_id,
      'email',
      rec.user_id::text,
      jsonb_build_object('sub', rec.user_id::text, 'email', rec.email),
      now(),
      now(),
      now()
    );

    insert into public.profiles (
      user_id,
      display_name,
      preferred_language,
      theme_preference
    )
    values (
      rec.user_id,
      rec.display_name,
      rec.preferred_language,
      rec.theme_preference
    );
  end loop;
end $$;

-- Families and memberships (T1.2) — stable UUIDs in docs/fixtures/TEST_IDENTITIES.md
insert into
  public.families (id, name, default_language, created_by)
values
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
    'Andersen Test Kitchen',
    'en',
    '11111111-1111-4111-8111-111111111101'::uuid
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid,
    'Berg Test Pantry',
    'en',
    '22222222-2222-4222-8222-222222222201'::uuid
  );

insert into
  public.family_members (id, family_id, user_id, role, status, joined_at)
values
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001'::uuid,
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
    '11111111-1111-4111-8111-111111111101'::uuid,
    'owner',
    'active',
    now()
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0002'::uuid,
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
    '11111111-1111-4111-8111-111111111104'::uuid,
    'admin',
    'active',
    now()
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0003'::uuid,
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
    '11111111-1111-4111-8111-111111111102'::uuid,
    'editor',
    'active',
    now()
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0004'::uuid,
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
    '11111111-1111-4111-8111-111111111103'::uuid,
    'viewer',
    'active',
    now()
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0005'::uuid,
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
    '33333333-3333-4333-8333-333333333301'::uuid,
    'editor',
    'active',
    now()
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0001'::uuid,
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid,
    '22222222-2222-4222-8222-222222222201'::uuid,
    'owner',
    'active',
    now()
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0002'::uuid,
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid,
    '22222222-2222-4222-8222-222222222202'::uuid,
    'contributor',
    'active',
    now()
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0003'::uuid,
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid,
    '33333333-3333-4333-8333-333333333301'::uuid,
    'viewer',
    'active',
    now()
  );
