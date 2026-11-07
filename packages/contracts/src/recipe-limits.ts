/** String and collection bounds aligned with PROJECT_SPEC.md §7.1 and T2.1 decisions. */

export const RECIPE_TITLE_MIN = 1;
export const RECIPE_TITLE_MAX = 200;
export const RECIPE_DESCRIPTION_MAX = 5_000;
export const RECIPE_CATEGORY_MAX = 80;
export const RECIPE_NOTES_MAX = 10_000;
export const RECIPE_SERVINGS_MAX_FRACTION_DIGITS = 2;
/** Matches PostgreSQL `numeric(8,2)`. */
export const RECIPE_SERVINGS_MAX = 999_999.99;
/** Generous wire bound for prep/cook/step duration (365 days). */
export const RECIPE_MINUTES_MAX = 525_600;

export const RECIPE_INGREDIENT_NAME_MIN = 1;
export const RECIPE_INGREDIENT_NAME_MAX = 200;
export const RECIPE_INGREDIENT_UNIT_MAX = 60;
export const RECIPE_INGREDIENT_NOTES_MAX = 500;
export const RECIPE_INGREDIENT_QUANTITY_TEXT_MAX = 120;
/** Matches PostgreSQL `numeric(12,4)`. */
export const RECIPE_INGREDIENT_QUANTITY_MAX = 99_999_999.9999;
export const RECIPE_INGREDIENT_QUANTITY_MAX_FRACTION_DIGITS = 4;

export const RECIPE_STEP_INSTRUCTION_MIN = 1;
export const RECIPE_STEP_INSTRUCTION_MAX = 5_000;

export const FAMILY_TAG_NAME_MIN = 1;
export const FAMILY_TAG_NAME_MAX = 50;

export const RECIPE_TRANSLATION_TITLE_MIN = 1;
export const RECIPE_TRANSLATION_TITLE_MAX = 200;
export const RECIPE_TRANSLATION_DESCRIPTION_MAX = 5_000;
export const RECIPE_TRANSLATION_NOTES_MAX = 10_000;
export const RECIPE_TRANSLATION_INGREDIENT_NAME_MIN = 1;
export const RECIPE_TRANSLATION_INGREDIENT_NAME_MAX = 200;
export const RECIPE_TRANSLATION_INGREDIENT_NOTES_MAX = 500;
export const RECIPE_TRANSLATION_STEP_INSTRUCTION_MIN = 1;
export const RECIPE_TRANSLATION_STEP_INSTRUCTION_MAX = 5_000;

export const RECIPE_LANGUAGE_TAG_MAX_LENGTH = 35;

/** MVP wire-format caps (documented in DECISIONS.md). */
export const MAX_RECIPE_INGREDIENTS = 500;
export const MAX_RECIPE_STEPS = 500;
export const MAX_TAGS_PER_RECIPE = 50;
export const MAX_RECIPE_TRANSLATIONS = 20;
export const MAX_RECIPE_INGREDIENT_TRANSLATIONS = MAX_RECIPE_INGREDIENTS * MAX_RECIPE_TRANSLATIONS;
export const MAX_RECIPE_STEP_TRANSLATIONS = MAX_RECIPE_STEPS * MAX_RECIPE_TRANSLATIONS;

export const SEARCH_RECIPES_LIMIT_MIN = 1;
export const SEARCH_RECIPES_LIMIT_MAX = 50;
export const SEARCH_QUERY_MAX = 200;
export const SEARCH_INGREDIENT_MAX = 200;
export const SEARCH_CATEGORY_MAX = 80;
export const SEARCH_TAG_MAX = 50;

export const RECIPE_CHANGE_SUMMARY_MAX = 500;

export const RECIPE_HISTORY_LIMIT_MIN = 1;
export const RECIPE_HISTORY_LIMIT_MAX = 50;

/** True when `value` fits a `numeric(p, s)` scale (JSON numbers, not arbitrary floats). */
export function hasAtMostFractionDigits(value: number, fractionDigits: number): boolean {
  if (!Number.isFinite(value) || !Number.isInteger(fractionDigits) || fractionDigits < 0) {
    return false;
  }
  return Number(value.toFixed(fractionDigits)) === value;
}
