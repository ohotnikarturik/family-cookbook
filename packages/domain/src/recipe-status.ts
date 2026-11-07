export const RECIPE_STATUSES = ['active', 'archived'] as const;
export type RecipeStatus = (typeof RECIPE_STATUSES)[number];

export const TRANSLATION_REVIEW_STATUSES = ['unreviewed', 'reviewed'] as const;
export type TranslationReviewStatus = (typeof TRANSLATION_REVIEW_STATUSES)[number];
