# T3.3 — Manual recipe translations (UI)

## Prep

1. `pnpm supabase:reset` (includes English + Ukrainian translations on Family A buns).
2. `pnpm dev:web`
3. Sign in as **editor-a@family-cookbook.test** or **owner-a@family-cookbook.test**.

## Detail selector

1. Open `http://localhost:3003/en/f/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/recipes/eeeeeeee-eeee-4eee-8eee-eeeeeeee0101`
2. **Reading language** shows **Original (fi)**, **en**, **uk** (uk has **Unreviewed** badge).
3. Select **en** — title and steps switch to English; URL gains `?viewLang=en`.
4. Select **Original (fi)** — Finnish source text returns; `viewLang` removed from URL.

## Manage translations

1. Click **Translations** → list shows **Edit en**, **Edit uk**, and **Add ru** (if not present).
2. Open **Edit uk** — form shows Ukrainian title and originals beside fields on wide screens.
3. Save changes → detail page shows updated Ukrainian text when `viewLang=uk`.
4. As **contributor** on own recipe: save works but **Mark as reviewed** is hidden; status stays unreviewed.

## Original unchanged

After saving a translation, re-open **Original (fi)** — `Grandma's cardamom buns` and Finnish steps unchanged.

## Contributor vs viewer

- **viewer-a** — no **Translations** or **Edit** buttons; can still use the language selector.
- **contributor-b** on another member's recipe — no translation edit access.
