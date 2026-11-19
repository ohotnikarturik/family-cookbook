-- W38.21 follow-up: one family-scoped "any text" match, evaluated in the database.
--
-- Replaces the client-side two-step lookup (up to 200 ingredient rows, ids inlined into the request
-- URL). The function returns whole `recipes` rows, so PostgREST still applies the other filters,
-- sorting, keyset cursor, paging and exact count on top of it. It is SECURITY INVOKER: row level
-- security decides which recipes the caller can see; nothing here widens access.
--
-- A recipe matches when the text is a substring of its title, description, category or any
-- ingredient name (so partial words such as "chick" work everywhere), or when the words match its
-- full-text document (so "soup chicken" finds "chicken soup").

create or replace function public.recipes_matching_text (p_family_id uuid, p_text text)
returns setof public.recipes
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
  with needle as (
    select
      '%' || replace(replace(replace(btrim(p_text), '\', '\\'), '%', '\%'), '_', '\_') || '%' as pattern,
      btrim(p_text) as plain
  )
  select
    r.*
  from
    public.recipes r,
    needle n
  where
    r.family_id = p_family_id
    and char_length(n.plain) between 1 and 200
    and (
      r.title ilike n.pattern
      or r.description ilike n.pattern
      or r.category ilike n.pattern
      or r.search_document @@ websearch_to_tsquery('simple', n.plain)
      or exists (
        select 1
        from public.recipe_ingredients i
        where i.recipe_id = r.id
          and i.family_id = r.family_id
          and i.name ilike n.pattern
      )
    );
$$;

comment on function public.recipes_matching_text (uuid, text) is
  'Family recipes whose title, description, category or an ingredient name contains the text, or whose full-text document matches it. SECURITY INVOKER: RLS applies.';

revoke all on function public.recipes_matching_text (uuid, text)
from
  public;

grant
execute on function public.recipes_matching_text (uuid, text) to authenticated;
