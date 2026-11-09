import type { TranslationReviewStatus } from './recipe-status.js';

export type RecipeDisplayIngredient = Readonly<{
  position: number;
  name: string;
  notes: string | null;
  usedFallback: boolean;
  notesFallback: boolean;
}>;

export type RecipeDisplayStep = Readonly<{
  position: number;
  instruction: string;
  mediaAssetId?: string | null;
  usedFallback: boolean;
}>;

export type ResolvedRecipeDisplay = Readonly<{
  title: string;
  description: string | null;
  notes: string | null;
  ingredients: RecipeDisplayIngredient[];
  steps: RecipeDisplayStep[];
  contentLang: string;
  mode: 'original' | 'translation';
  translationReviewStatus: TranslationReviewStatus | null;
  descriptionFallback: boolean;
  notesFallback: boolean;
}>;

export type RecipeForDisplay = Readonly<{
  title: string;
  description: string | null;
  notes: string | null;
  sourceLanguage: string;
  ingredients: ReadonlyArray<{
    position: number;
    name: string;
    notes?: string | null | undefined;
  }>;
  steps: ReadonlyArray<{
    position: number;
    instruction: string;
    mediaAssetId?: string | null;
  }>;
  translations: ReadonlyArray<{
    languageTag: string;
    title: string;
    description: string | null | undefined;
    notes: string | null | undefined;
    reviewStatus?: TranslationReviewStatus;
  }>;
  ingredientTranslations: ReadonlyArray<{
    ingredientPosition: number;
    languageTag: string;
    name: string;
    notes?: string | null;
  }>;
  stepTranslations: ReadonlyArray<{
    stepPosition: number;
    languageTag: string;
    instruction: string;
  }>;
}>;

function normalizeLanguageTag(tag: string): string {
  return tag.trim().toLowerCase();
}

export function resolveRecipeDisplay(
  recipe: RecipeForDisplay,
  viewLanguage: string | null | undefined,
): ResolvedRecipeDisplay {
  const source = normalizeLanguageTag(recipe.sourceLanguage);
  const requested = viewLanguage ? normalizeLanguageTag(viewLanguage) : source;

  if (requested === source) {
    return {
      title: recipe.title,
      description: recipe.description,
      notes: recipe.notes,
      ingredients: recipe.ingredients.map((item) => ({
        position: item.position,
        name: item.name,
        notes: item.notes ?? null,
        usedFallback: false,
        notesFallback: false,
      })),
      steps: recipe.steps.map((item) => ({
        position: item.position,
        instruction: item.instruction,
        ...(item.mediaAssetId ? { mediaAssetId: item.mediaAssetId } : {}),
        usedFallback: false,
      })),
      contentLang: recipe.sourceLanguage,
      mode: 'original',
      translationReviewStatus: null,
      descriptionFallback: false,
      notesFallback: false,
    };
  }

  const recipeTranslation = recipe.translations.find(
    (item) => normalizeLanguageTag(item.languageTag) === requested,
  );

  if (!recipeTranslation) {
    return resolveRecipeDisplay(recipe, recipe.sourceLanguage);
  }

  const ingredientByPosition = new Map(
    recipe.ingredientTranslations
      .filter((item) => normalizeLanguageTag(item.languageTag) === requested)
      .map((item) => [item.ingredientPosition, item] as const),
  );

  const stepByPosition = new Map(
    recipe.stepTranslations
      .filter((item) => normalizeLanguageTag(item.languageTag) === requested)
      .map((item) => [item.stepPosition, item] as const),
  );

  const description = recipeTranslation.description ?? recipe.description;
  const notes = recipeTranslation.notes ?? recipe.notes;

  return {
    title: recipeTranslation.title,
    description,
    notes,
    ingredients: recipe.ingredients.map((item) => {
      const translated = ingredientByPosition.get(item.position);
      const originalNotes = item.notes ?? null;
      if (!translated) {
        return {
          position: item.position,
          name: item.name,
          notes: originalNotes,
          usedFallback: true,
          notesFallback: false,
        };
      }
      const translatedNotes = translated.notes ?? null;
      return {
        position: item.position,
        name: translated.name,
        notes: translatedNotes ?? originalNotes,
        usedFallback: false,
        notesFallback: translatedNotes === null && originalNotes !== null,
      };
    }),
    steps: recipe.steps.map((item) => {
      const translated = stepByPosition.get(item.position);
      if (!translated) {
        return {
          position: item.position,
          instruction: item.instruction,
          ...(item.mediaAssetId ? { mediaAssetId: item.mediaAssetId } : {}),
          usedFallback: true,
        };
      }
      return {
        position: item.position,
        instruction: translated.instruction,
        ...(item.mediaAssetId ? { mediaAssetId: item.mediaAssetId } : {}),
        usedFallback: false,
      };
    }),
    contentLang: recipeTranslation.languageTag,
    mode: 'translation',
    translationReviewStatus: recipeTranslation.reviewStatus ?? 'unreviewed',
    descriptionFallback: recipeTranslation.description == null && recipe.description != null,
    notesFallback: recipeTranslation.notes == null && recipe.notes != null,
  };
}
