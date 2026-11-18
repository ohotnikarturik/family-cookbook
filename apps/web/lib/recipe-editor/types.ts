import type {
  RecipeIngredientTranslationInput,
  RecipeStepTranslationInput,
  RecipeTranslationInput,
} from '@family-cookbook/contracts';

/**
 * The stored pair of a row that has both a number and text. While `amount` still shows
 * `kept.amount`, saving writes both back unchanged.
 */
export type RecipeEditorKeptAmount = Readonly<{
  amount: string;
  quantity: number;
  quantityText: string;
}>;

export type RecipeEditorIngredientDraft = Readonly<{
  clientKey: string;
  /** One field: a number such as `1 1/2` becomes `quantity`, anything else `quantityText`. */
  amount: string;
  unit: string;
  name: string;
  notes: string;
  kept?: RecipeEditorKeptAmount;
}>;

export type RecipeEditorStepDraft = Readonly<{
  clientKey: string;
  instruction: string;
  durationMinutes: string;
  mediaAssetId?: string | null;
}>;

export type RecipeEditorMediaContext = Readonly<{
  familyId: string;
  recipeId: string;
  assetCount: number;
  onAssetUploaded: (assetId: string) => void;
}>;

export type RecipeEditorTagDraft = Readonly<{
  clientKey: string;
  tagId?: string;
  name: string;
}>;

export type SourceLanguagePreset = 'en' | 'fi' | 'ru' | 'uk' | 'other';

export type RecipeEditorDraft = Readonly<{
  title: string;
  sourceLanguagePreset: SourceLanguagePreset;
  sourceLanguageOther: string;
  description: string;
  category: string;
  servings: string;
  prepMinutes: string;
  cookMinutes: string;
  notes: string;
  ingredients: RecipeEditorIngredientDraft[];
  steps: RecipeEditorStepDraft[];
  tags: RecipeEditorTagDraft[];
}>;

export type PreservedTranslationCollections = Readonly<{
  translations: RecipeTranslationInput[];
  ingredientTranslations: RecipeIngredientTranslationInput[];
  stepTranslations: RecipeStepTranslationInput[];
}>;

export type RecipeEditorMode =
  | Readonly<{ kind: 'create'; familyId: string; defaultSourceLanguage: string }>
  | Readonly<{
      kind: 'edit';
      familyId: string;
      recipeId: string;
      expectedVersion: number;
      preserved: PreservedTranslationCollections;
    }>;
