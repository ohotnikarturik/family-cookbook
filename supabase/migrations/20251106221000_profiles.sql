-- Profiles: user preferences and display identity (PROJECT_SPEC §7.1).
-- RLS: each row is scoped to auth.users; no service-role in app requests.

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  preferred_language text not null default 'en',
  theme_preference text not null default 'system',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_preferred_language_ck check (preferred_language in ('en', 'fi', 'ru', 'uk')),
  constraint profiles_theme_preference_ck check (theme_preference in ('system', 'light', 'dark'))
);

comment on table public.profiles is 'One row per Supabase Auth user; UI locale and theme preferences.';

create index profiles_preferred_language_idx on public.profiles (preferred_language);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "profiles_insert_own"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- RLS does not grant privileges. Anonymous and public roles get none.
revoke all on table public.profiles from public, anon, authenticated;
grant select, insert, update on table public.profiles to authenticated;
