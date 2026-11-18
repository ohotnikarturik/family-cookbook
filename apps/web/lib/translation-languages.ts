/** UI locales a recipe can be translated into from the web app. */
export const TRANSLATION_LANGUAGES = ['en', 'fi', 'ru', 'uk'] as const;

/**
 * Languages still free to add: not the source language and not an existing translation
 * (tags compared case-insensitively), in a fixed order.
 */
export function availableTranslationLanguages(
  recipe: Readonly<{ sourceLanguage: string; translations: readonly { languageTag: string }[] }>,
): string[] {
  const used = new Set(recipe.translations.map((item) => item.languageTag.toLowerCase()));
  used.add(recipe.sourceLanguage.toLowerCase());
  return TRANSLATION_LANGUAGES.filter((tag) => !used.has(tag));
}
