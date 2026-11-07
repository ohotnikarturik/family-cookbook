begin;

select plan (3);

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
  *
from
  finish ();

rollback;
