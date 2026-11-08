import type {
  RecipeIngredientTranslationInput,
  RecipeStepTranslationInput,
  RecipeTranslationInput,
} from '@family-cookbook/contracts';

export type RecipeEditorIngredientDraft = Readonly<{
  clientKey: string;
  name: string;
  quantity: string;
  quantityText: string;
  unit: string;
  notes: string;
}>;

export type RecipeEditorStepDraft = Readonly<{
  clientKey: string;
  instruction: string;
  durationMinutes: string;
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
