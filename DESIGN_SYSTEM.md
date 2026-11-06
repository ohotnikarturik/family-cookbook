# Family Cookbook — Design System Brief

**Status:** Product direction approved; exact visual values are to be implemented and reviewed in the design preview.
**Version:** 1.0

This document is a binding implementation brief for the web UI. It deliberately defines a visual direction and design constraints without pretending that a final visual brand has already been art-directed or user-tested.

## 1. Product personality

The interface should feel like a thoughtful, modern family cookbook: warm, editorial, generous, trustworthy, practical, and easy to approach. It should work for children helping in the kitchen, parents organizing family meals, and older relatives who may have limited confidence with modern apps.

It must not look like an untouched shadcn/ui starter, generic admin dashboard, developer tool, or dense enterprise SaaS product.

Design principles:
- **Warm, not childish:** welcoming colors and photography, but a restrained and mature visual language.
- **Editorial, not ornamental:** confident recipe typography, hierarchy and whitespace; avoid decorative clutter.
- **Practical first:** ingredients and steps are the hero. Visual styling must never reduce legibility or make the core cooking tasks harder.
- **Familiar interaction:** obvious buttons, predictable navigation, visible labels, clear success/error feedback.
- **Inclusive by default:** robust keyboard, screen-reader, zoom, contrast, and touch support.

## 2. Art direction

Initial direction to use as a starting point (fine-tune only through centralized tokens):

- **Light theme:** warm paper/cream page background; white or subtly warm raised surfaces; dark ink text; restrained herb/olive and terracotta accents.
- **Dark theme:** deep warm charcoal or forest-tinted surfaces; warm off-white text; adjusted accents that preserve contrast. Do not merely invert light-mode values.
- **Photography:** prioritize family-uploaded food photographs. Use large image areas on editorial recipe details and smaller consistent thumbnails in lists. Preserve originals and avoid text overlays on photos unless legibility is guaranteed.
- **Typography:** readable sans-serif body/UI type. A tasteful serif may be used for display headings and recipe titles if it supports every initial language (English, Finnish, Russian and Ukrainian). Keep small text, form controls, ingredient quantities and cooking instructions in the readable sans-serif.
- **Shape and depth:** modest, consistent corner-radius scale; subtle surfaces and borders; use shadows sparingly. Avoid every element becoming a rounded card.
- **Iconography:** one consistent icon library. Icons support comprehension; important actions also have visible text labels.

Do not hard-code a final color palette or typeface before checking real contrast, glyph support, and the appearance of long Finnish, Russian and Ukrainian strings. Make the final decision in token files and record it here after the design preview has been reviewed.

## 3. Component foundations

Use shadcn/ui as a source of editable, accessible primitives where useful. It does not define the product's visual identity. Generated component source belongs in the repository and may be customized.

Create a small purposeful product component layer, including:
- `AppShell`, `PrimaryNavigation`, `MobileNavigation`, `FamilySwitcher`
- `RecipeCard`, `RecipeGrid`, `RecipeList`, `RecipeHeader`
- `IngredientList`, `IngredientRow`, `RecipeStep`
- `RecipeSourceGallery`, `PhotoUpload`, `AttachmentRow`
- `LanguageSwitcher`, `ThemeSwitcher`
- `FormField`, `FormErrorSummary`, `StatusMessage`, `EmptyState`, `LoadingState`, `ConfirmAction`

Prefer semantic variants (primary, secondary, quiet, destructive) rather than one-off visual overrides. Do not add a new component variant for a single page if a shared pattern already fits.

## 4. Design tokens

Centralize tokens in the global theme stylesheet and, where helpful, typed token documentation. Use semantic names instead of raw values in components.

### Color roles

At minimum provide light and dark values for:
- `background`, `foreground`
- `surface`, `surface-raised`, `surface-sunken`
- `muted`, `muted-foreground`
- `primary`, `primary-foreground`
- `secondary`, `secondary-foreground`
- `accent`, `accent-foreground`
- `border`, `input`, `ring`
- `destructive`, `destructive-foreground`
- `success`, `warning`, `info` and associated foregrounds
- `overlay`, `scrim`

Color roles must pass the relevant WCAG contrast requirements in all states, including hover, focus, disabled, selected, validation and status. Do not communicate status by color alone; include text/icon/shape.

### Non-color tokens

Define documented scales for:
- typography family, sizes, line heights, weights and heading styles;
- spacing and content gutters;
- readable content max-width and recipe text measure;
- control height and touch target sizing;
- corner radii;
- border widths;
- elevation/shadows;
- focus outline and offset;
- transition duration/easing.

Components should use these tokens. The goal is that a later brand refresh can be done primarily in the theme/token layer rather than by searching every component for hex codes.

## 5. Theme behavior

The app supports:
- `system` — follow the OS/browser color-scheme preference;
- `light` — explicitly use light theme;
- `dark` — explicitly use dark theme.

Default is `system`. Persist the signed-in user's selected preference in `profiles.theme_preference`; for pre-auth screens use a safe cookie/local preference as a presentation hint only, never as authorization. Apply the selected theme early enough to avoid a noticeable flash. Theme preference follows the user between family workspaces.

All interactive states and all routes must be reviewed in both light and dark themes. Avoid hard-coded colors in SVGs, charts, uploaded-image frames, and third-party components.

## 6. Internationalization and content language

Initial UI locales: `en`, `fi`, `ru`, `uk`. Use `next-intl` message catalogs with feature namespaces. All UI copy—including errors, empty states, toasts, emails and confirmation text—must be externalized. No visible text literals inside reusable components, route handlers or Server Actions except unavoidable technical values.

Use BCP 47 locale tags. The UI language is a user preference; a family default is a content-entry default; recipe source language and recipe translations are data metadata. Do not silently translate or overwrite a recipe. Set the page `lang` and mark recipe content fragments with the appropriate `lang` where it differs.

Use locale-aware formatting for dates, times, numbers, decimals and plural forms. Avoid string concatenation that assumes English grammar or word order. Test long translated text and text expansion in controls and navigation.

Adding a locale should require adding catalog files and locale configuration, not rewriting business logic. Add a missing-key/completeness check to CI or a documented release check.

## 7. All-ages interaction patterns

- Use plain, familiar language. Write action labels as verbs: “Add recipe”, “Save changes”, “Invite family member”.
- Keep main navigation visible and stable. On phones, use simple labeled navigation; on larger screens use a clear side or top navigation.
- Do not use icon-only primary navigation or rely on tooltips to explain important actions.
- Keep the primary action visually clear, but do not use excessive badges or bright colors everywhere.
- Use one readable column for recipe ingredients and steps. Use generous line spacing and clear numbering.
- Use large, forgiving controls and comfortable spacing. Aim for 44×44 CSS px for primary touch targets.
- Never require hover, drag-and-drop, swiping or precise gestures to complete an essential action; provide button alternatives.
- Make confirmation language explicit. “Archive this recipe? It will be hidden from the active recipe list and can be restored later.” is preferable to “Are you sure?”.
- Preserve work after validation and recoverable network errors. Clearly distinguish saving, saved, and failed states.
- Avoid dense dashboards, tiny metadata, overly complex settings, surprise navigation, and ambiguous icons.

## 8. Accessibility acceptance rules

Target WCAG 2.2 AA. The design must support:
- keyboard-only navigation and operation;
- visible focus indicators that are not obscured;
- correct labels, descriptions, names, roles, headings and landmarks;
- text contrast at least 4.5:1 for normal text and 3:1 for large text; applicable non-text UI boundaries/focus indicators must meet WCAG AA contrast;
- text resizing to 200% and reflow at 320 CSS px without loss of normal content/functionality;
- touch targets at least 24×24 CSS px as the WCAG 2.2 AA baseline, with 44×44 CSS px preferred for primary controls;
- reduced-motion preference;
- screen-reader announcements for async state, form errors and successful saves;
- accessible dialogs, menus and popovers with focus management and Escape behavior;
- descriptive alt text for meaningful images and correct language metadata for multilingual recipe passages.

Run automated axe checks on critical Playwright pages. Before release, carry out manual keyboard-only and screen-reader testing; automated checks alone are not an accessibility conformance claim.

## 9. Responsive behavior

Design at 360px first, test down to 320px, then widen to tablet and desktop. Primary journeys must not require horizontal scrolling at 320px. Recipe detail uses a single-column reading flow on phones. On wide screens, use space for a restrained editorial layout rather than simply stretching text to the full viewport width.

The upload flow should support taking a photo from a mobile device where the browser allows it. Always offer a normal file-picker/button path as an alternative to drag-and-drop.

## 10. Design QA checklist

Before a UI task is complete, check:
- light, dark, and system theme behavior;
- 320px, 360px, tablet, and desktop layouts;
- 200% text zoom;
- English, Finnish, Russian, and Ukrainian text, including long labels;
- keyboard-only navigation and visible/non-obscured focus;
- 44px primary touch controls and spacing;
- loading, empty, error, forbidden, network-failure and success states;
- reduced-motion behavior;
- contrast and color-independent status cues;
- no visible hard-coded strings outside message catalogs;
- no unmodified shadcn default look or one-off hard-coded color values.

## 11. Official references

- WCAG 2.2: https://www.w3.org/TR/WCAG22/
- Next.js App Router internationalization: https://nextjs.org/docs/app/guides/internationalization
- next-intl: https://next-intl.dev/docs/getting-started
- shadcn/ui: https://ui.shadcn.com/docs
- shadcn/ui theming: https://ui.shadcn.com/docs/theming
