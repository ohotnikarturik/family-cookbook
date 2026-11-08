-- An UPDATE's new row must also satisfy SELECT policies. Rejected was
-- invisible, so pending -> rejected failed the select check even when the
-- update policy allowed it. The uploader and editor+ can read rejected rows;
-- quarantined stays hidden, and viewers still cannot read another member's
-- pending or rejected slot.

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
        processing_status in ('pending', 'rejected')
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
