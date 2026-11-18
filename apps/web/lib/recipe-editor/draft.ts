import type { RecipeDetail } from '@family-cookbook/contracts';

import { formatAmountInput, formatOptionalNumber } from './parse-numbers';
import type {
  PreservedTranslationCollections,
  RecipeEditorDraft,
  RecipeEditorIngredientDraft,
  RecipeEditorKeptAmount,
  RecipeEditorStepDraft,
  SourceLanguagePreset,
} from './types.js';

const PRESET_LANGUAGES: readonly SourceLanguagePreset[] = ['en', 'fi', 'ru', 'uk'];

export function newClientKey(): string {
  return globalThis.crypto.randomUUID();
}

export function emptyIngredientRow(): RecipeEditorIngredientDraft {
  return {
    clientKey: newClientKey(),
    amount: '',
    unit: '',
    name: '',
    notes: '',
  };
}

type StoredIngredient = RecipeDetail['ingredients'][number];

/** Loads a stored ingredient into the editor's single Amount field. */
export function ingredientDraftFromStored(
  item: StoredIngredient,
  locale: string,
): RecipeEditorIngredientDraft {
  const quantity = item.quantity ?? null;
  const text = item.quantityText?.trim() ?? '';
  const base = {
    clientKey: newClientKey(),
    unit: item.unit ?? '',
    name: item.name,
    notes: item.notes ?? '',
  };
  if (text.length > 0 && quantity !== null) {
    // The detail page shows the text; keep the number too unless the amount is edited.
    return { ...base, amount: text, kept: { amount: text, quantity, quantityText: text } };
  }
  if (text.length > 0) {
    return { ...base, amount: text };
  }
  return { ...base, amount: quantity === null ? '' : formatAmountInput(quantity, locale) };
}

export function emptyStepRow(): RecipeEditorStepDraft {
  return {
    clientKey: newClientKey(),
    instruction: '',
    durationMinutes: '',
  };
}

export function resolveSourceLanguageFromDraft(draft: RecipeEditorDraft): string {
  if (draft.sourceLanguagePreset === 'other') {
    return draft.sourceLanguageOther.trim();
  }
  return draft.sourceLanguagePreset;
}

export function sourceLanguagePresetForTag(tag: string): {
  preset: SourceLanguagePreset;
  other: string;
} {
  const normalized = tag.trim();
  if ((PRESET_LANGUAGES as readonly string[]).includes(normalized)) {
    return { preset: normalized as SourceLanguagePreset, other: '' };
  }
  return { preset: 'other', other: normalized };
}

export function emptyRecipeEditorDraft(defaultSourceLanguage: string): RecipeEditorDraft {
  const { preset, other } = sourceLanguagePresetForTag(defaultSourceLanguage);
  return {
    title: '',
    sourceLanguagePreset: preset,
    sourceLanguageOther: other,
    description: '',
    category: '',
    servings: '',
    prepMinutes: '',
    cookMinutes: '',
    notes: '',
    ingredients: [emptyIngredientRow()],
    steps: [emptyStepRow()],
    tags: [],
  };
}

export function familyDefaultToSourceLanguage(defaultLanguage: string): string {
  return defaultLanguage;
}

export function preservedTranslationsFromDetail(
  recipe: RecipeDetail,
): PreservedTranslationCollections {
  return {
    translations: recipe.translations.map((item) => ({
      languageTag: item.languageTag,
      title: item.title,
      description: item.description ?? null,
      notes: item.notes ?? null,
    })),
    ingredientTranslations: recipe.ingredientTranslations.map((item) => ({
      ingredientPosition: item.ingredientPosition,
      languageTag: item.languageTag,
      name: item.name,
      notes: item.notes ?? null,
    })),
    stepTranslations: recipe.stepTranslations.map((item) => ({
      stepPosition: item.stepPosition,
      languageTag: item.languageTag,
      instruction: item.instruction,
    })),
  };
}

export function draftFromRecipeDetail(recipe: RecipeDetail, locale: string): RecipeEditorDraft {
  const { preset, other } = sourceLanguagePresetForTag(recipe.sourceLanguage);
  return {
    title: recipe.title,
    sourceLanguagePreset: preset,
    sourceLanguageOther: other,
    description: recipe.description ?? '',
    category: recipe.category ?? '',
    servings: formatOptionalNumber(recipe.servings),
    prepMinutes: formatOptionalNumber(recipe.prepMinutes),
    cookMinutes: formatOptionalNumber(recipe.cookMinutes),
    notes: recipe.notes ?? '',
    ingredients:
      recipe.ingredients.length > 0
        ? recipe.ingredients.map((item) => ingredientDraftFromStored(item, locale))
        : [emptyIngredientRow()],
    steps:
      recipe.steps.length > 0
        ? recipe.steps.map((item) => ({
            clientKey: newClientKey(),
            instruction: item.instruction,
            durationMinutes: formatOptionalNumber(item.durationMinutes ?? null),
            ...(item.mediaAssetId ? { mediaAssetId: item.mediaAssetId } : {}),
          }))
        : [emptyStepRow()],
    tags: recipe.tags.map((tag) => ({
      clientKey: newClientKey(),
      tagId: tag.id,
      name: tag.name,
    })),
  };
}

export function tagDraftWithName(
  tag: RecipeEditorDraft['tags'][number],
  name: string,
): RecipeEditorDraft['tags'][number] {
  if (tag.tagId !== undefined && name.trim() !== tag.name.trim()) {
    return { clientKey: tag.clientKey, name };
  }
  return { ...tag, name };
}

export function parseRecipeEditorDraftJson(raw: unknown): RecipeEditorDraft | null {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 2_000_000) {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) {
    return null;
  }
  const record = parsed as Record<string, unknown>;
  return coerceDraft(record);
}

function coerceDraft(record: Record<string, unknown>): RecipeEditorDraft | null {
  const title = typeof record.title === 'string' ? record.title : '';
  const preset = coercePreset(record.sourceLanguagePreset);
  const sourceLanguageOther =
    typeof record.sourceLanguageOther === 'string' ? record.sourceLanguageOther : '';
  const description = typeof record.description === 'string' ? record.description : '';
  const category = typeof record.category === 'string' ? record.category : '';
  const servings = typeof record.servings === 'string' ? record.servings : '';
  const prepMinutes = typeof record.prepMinutes === 'string' ? record.prepMinutes : '';
  const cookMinutes = typeof record.cookMinutes === 'string' ? record.cookMinutes : '';
  const notes = typeof record.notes === 'string' ? record.notes : '';

  return {
    title,
    sourceLanguagePreset: preset,
    sourceLanguageOther,
    description,
    category,
    servings,
    prepMinutes,
    cookMinutes,
    notes,
    ingredients: coerceIngredients(record.ingredients),
    steps: coerceSteps(record.steps),
    tags: coerceTags(record.tags),
  };
}

function coercePreset(value: unknown): SourceLanguagePreset {
  if (value === 'en' || value === 'fi' || value === 'ru' || value === 'uk' || value === 'other') {
    return value;
  }
  return 'en';
}

function coerceIngredients(value: unknown): RecipeEditorIngredientDraft[] {
  if (!Array.isArray(value)) {
    return [emptyIngredientRow()];
  }
  const rows = value
    .map((item) => {
      if (typeof item !== 'object' || item === null) {
        return null;
      }
      const row = item as Record<string, unknown>;
      const ingredient: RecipeEditorIngredientDraft = {
        clientKey: typeof row.clientKey === 'string' ? row.clientKey : newClientKey(),
        amount: coerceAmount(row),
        unit: typeof row.unit === 'string' ? row.unit : '',
        name: typeof row.name === 'string' ? row.name : '',
        notes: typeof row.notes === 'string' ? row.notes : '',
      };
      const kept = coerceKept(row.kept);
      return kept ? { ...ingredient, kept } : ingredient;
    })
    .filter((item): item is RecipeEditorIngredientDraft => item !== null);
  return rows.length > 0 ? rows : [emptyIngredientRow()];
}

/** `amount`, or the two fields an editor from before W38.15 sent. */
function coerceAmount(row: Record<string, unknown>): string {
  if (typeof row.amount === 'string') {
    return row.amount;
  }
  if (typeof row.quantityText === 'string' && row.quantityText.trim().length > 0) {
    return row.quantityText;
  }
  return typeof row.quantity === 'string' ? row.quantity : '';
}

function coerceKept(value: unknown): RecipeEditorKeptAmount | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const kept = value as Record<string, unknown>;
  if (
    typeof kept.amount !== 'string' ||
    typeof kept.quantityText !== 'string' ||
    typeof kept.quantity !== 'number' ||
    !Number.isFinite(kept.quantity)
  ) {
    return null;
  }
  return { amount: kept.amount, quantity: kept.quantity, quantityText: kept.quantityText };
}

function coerceSteps(value: unknown): RecipeEditorStepDraft[] {
  if (!Array.isArray(value)) {
    return [emptyStepRow()];
  }
  const rows = value
    .map((item) => {
      if (typeof item !== 'object' || item === null) {
        return null;
      }
      const row = item as Record<string, unknown>;
      const step: RecipeEditorStepDraft = {
        clientKey: typeof row.clientKey === 'string' ? row.clientKey : newClientKey(),
        instruction: typeof row.instruction === 'string' ? row.instruction : '',
        durationMinutes: typeof row.durationMinutes === 'string' ? row.durationMinutes : '',
      };
      if (typeof row.mediaAssetId === 'string' && row.mediaAssetId.length > 0) {
        return { ...step, mediaAssetId: row.mediaAssetId };
      }
      return step;
    })
    .filter((item): item is RecipeEditorStepDraft => item !== null);
  return rows.length > 0 ? rows : [emptyStepRow()];
}

function coerceTags(value: unknown): RecipeEditorDraft['tags'] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item) => {
    if (typeof item !== 'object' || item === null) {
      return [];
    }
    const row = item as Record<string, unknown>;
    const name = typeof row.name === 'string' ? row.name : '';
    if (name.trim().length === 0) {
      return [];
    }
    const clientKey =
      typeof row.clientKey === 'string' && row.clientKey.length > 0 && row.clientKey.length <= 80
        ? row.clientKey
        : newClientKey();
    const tagId = typeof row.tagId === 'string' ? row.tagId : undefined;
    return tagId ? [{ clientKey, tagId, name }] : [{ clientKey, name }];
  });
}
