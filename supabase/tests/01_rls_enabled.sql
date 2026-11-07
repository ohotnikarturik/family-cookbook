begin;

select plan (13);

select
  ok (
    (
      select
        relrowsecurity
      from
        pg_class c
        join pg_namespace n on n.oid = c.relnamespace
      where
        n.nspname = 'public'
        and c.relname = 'families'
    ),
    'families has RLS enabled'
  );

select
  ok (
    (
      select
        relrowsecurity
      from
        pg_class c
        join pg_namespace n on n.oid = c.relnamespace
      where
        n.nspname = 'public'
        and c.relname = 'family_members'
    ),
    'family_members has RLS enabled'
  );

select
  ok (
    (
      select
        relrowsecurity
      from
        pg_class c
        join pg_namespace n on n.oid = c.relnamespace
      where
        n.nspname = 'public'
        and c.relname = 'family_invitations'
    ),
    'family_invitations has RLS enabled'
  );

select
  ok (
    (
      select
        relrowsecurity
      from
        pg_class c
        join pg_namespace n on n.oid = c.relnamespace
      where
        n.nspname = 'public'
        and c.relname = 'recipes'
    ),
    'recipes has RLS enabled'
  );

select
  ok (
    (
      select
        relrowsecurity
      from
        pg_class c
        join pg_namespace n on n.oid = c.relnamespace
      where
        n.nspname = 'public'
        and c.relname = 'recipe_ingredients'
    ),
    'recipe_ingredients has RLS enabled'
  );

select
  ok (
    (
      select
        relrowsecurity
      from
        pg_class c
        join pg_namespace n on n.oid = c.relnamespace
      where
        n.nspname = 'public'
        and c.relname = 'recipe_steps'
    ),
    'recipe_steps has RLS enabled'
  );

select
  ok (
    (
      select
        relrowsecurity
      from
        pg_class c
        join pg_namespace n on n.oid = c.relnamespace
      where
        n.nspname = 'public'
        and c.relname = 'family_tags'
    ),
    'family_tags has RLS enabled'
  );

select
  ok (
    (
      select
        relrowsecurity
      from
        pg_class c
        join pg_namespace n on n.oid = c.relnamespace
      where
        n.nspname = 'public'
        and c.relname = 'recipe_tags'
    ),
    'recipe_tags has RLS enabled'
  );

select
  ok (
    (
      select
        relrowsecurity
      from
        pg_class c
        join pg_namespace n on n.oid = c.relnamespace
      where
        n.nspname = 'public'
        and c.relname = 'recipe_translations'
    ),
    'recipe_translations has RLS enabled'
  );

select
  ok (
    (
      select
        relrowsecurity
      from
        pg_class c
        join pg_namespace n on n.oid = c.relnamespace
      where
        n.nspname = 'public'
        and c.relname = 'recipe_ingredient_translations'
    ),
    'recipe_ingredient_translations has RLS enabled'
  );

select
  ok (
    (
      select
        relrowsecurity
      from
        pg_class c
        join pg_namespace n on n.oid = c.relnamespace
      where
        n.nspname = 'public'
        and c.relname = 'recipe_step_translations'
    ),
    'recipe_step_translations has RLS enabled'
  );

select
  ok (
    (
      select
        relrowsecurity
      from
        pg_class c
        join pg_namespace n on n.oid = c.relnamespace
      where
        n.nspname = 'public'
        and c.relname = 'recipe_revisions'
    ),
    'recipe_revisions has RLS enabled'
  );

select
  ok (
    (
      select
        relrowsecurity
      from
        pg_class c
        join pg_namespace n on n.oid = c.relnamespace
      where
        n.nspname = 'public'
        and c.relname = 'audit_events'
    ),
    'audit_events has RLS enabled'
  );

select
  *
from
  finish ();

rollback;
