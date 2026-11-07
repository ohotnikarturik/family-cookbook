-- LOCAL DEVELOPMENT ONLY — never run against a hosted Supabase project.
-- Deterministic auth users + public.profiles for tests (families/memberships: T1.2).
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
