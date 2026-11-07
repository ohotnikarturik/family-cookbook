import type { RecipeStatus, TranslationReviewStatus } from './recipe-status.js';

export type RecipeId = string;
export type FamilyId = string;
export type UserId = string;

export type Recipe = {
  id: RecipeId;
  familyId: FamilyId;
  createdBy: UserId;
  updatedBy: UserId;
  title: string;
  description: string | null;
  sourceLanguage: string;
  category: string | null;
  servings: number | null;
  prepMinutes: number | null;
  cookMinutes: number | null;
  notes: string | null;
  status: RecipeStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};

export type RecipeIngredient = {
  id: string;
  recipeId: RecipeId;
  familyId: FamilyId;
  position: number;
  name: string;
  quantity: number | null;
  quantityText: string | null;
  unit: string | null;
  notes: string | null;
};

export type RecipeStep = {
  id: string;
  recipeId: RecipeId;
  familyId: FamilyId;
  position: number;
  instruction: string;
  durationMinutes: number | null;
  mediaAssetId: string | null;
};

export type FamilyTag = {
  id: string;
  familyId: FamilyId;
  name: string;
  normalizedName: string;
  createdBy: UserId;
  createdAt: string;
};

export type RecipeTranslation = {
  id: string;
  recipeId: RecipeId;
  familyId: FamilyId;
  languageTag: string;
  title: string;
  description: string | null;
  notes: string | null;
  reviewStatus: TranslationReviewStatus;
  createdBy: UserId;
  reviewedBy: UserId | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RecipeIngredientTranslation = {
  id: string;
  ingredientId: string;
  familyId: FamilyId;
  languageTag: string;
  name: string;
  notes: string | null;
};

export type RecipeStepTranslation = {
  id: string;
  stepId: string;
  familyId: FamilyId;
  languageTag: string;
  instruction: string;
};

export type RecipeAggregate = {
  recipe: Recipe;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  tags: FamilyTag[];
  translations: RecipeTranslation[];
  ingredientTranslations: RecipeIngredientTranslation[];
  stepTranslations: RecipeStepTranslation[];
};
