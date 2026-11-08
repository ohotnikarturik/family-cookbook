import type { CreateRecipePayload, UpdateRecipePayload } from '@family-cookbook/contracts';
import { createRecipePayloadSchema, updateRecipePayloadSchema } from '@family-cookbook/contracts';

import { resolveSourceLanguageFromDraft } from './draft';
import {
  parseOptionalNonNegativeInt,
  parseOptionalPositiveNumber,
  trimToNull,
} from './parse-numbers';
import type { DraftFieldIssueCode, DraftIndexes } from './field-errors';
import type { PreservedTranslationCollections, RecipeEditorDraft } from './types';

export type BuiltRecipePayload<T> = Readonly<{
  payload: T;
  fieldErrors: Record<string, DraftFieldIssueCode>;
  indexes: DraftIndexes;
}>;

function isBlankIngredient(row: RecipeEditorDraft['ingredients'][number]): boolean {
  return (
    row.name.trim().length === 0 &&
    row.quantity.trim().length === 0 &&
    row.quantityText.trim().length === 0 &&
    row.unit.trim().length === 0 &&
    row.notes.trim().length === 0
  );
}

function isBlankStep(row: RecipeEditorDraft['steps'][number]): boolean {
  return row.instruction.trim().length === 0 && row.durationMinutes.trim().length === 0;
}

function mapIngredients(draft: RecipeEditorDraft): {
  rows: CreateRecipePayload['ingredients'];
  fieldErrors: Record<string, DraftFieldIssueCode>;
  indexes: number[];
} {
  const rows: CreateRecipePayload['ingredients'] = [];
  const fieldErrors: Record<string, DraftFieldIssueCode> = {};
  const indexes: number[] = [];

  for (const [index, row] of draft.ingredients.entries()) {
    if (isBlankIngredient(row)) {
      continue;
    }
    let rowInvalid = false;
    if (row.name.trim().length === 0) {
      fieldErrors[`ingredients.${index}.name`] = 'required';
      rowInvalid = true;
    }
    const quantity = parseOptionalPositiveNumber(row.quantity);
    if (quantity === 'invalid') {
      fieldErrors[`ingredients.${index}.quantity`] = 'invalidNumber';
      rowInvalid = true;
    }
    if (rowInvalid || quantity === 'invalid') {
      continue;
    }
    rows.push({
      position: rows.length + 1,
      name: row.name.trim(),
      quantity: quantity ?? undefined,
      quantityText: trimToNull(row.quantityText) ?? undefined,
      unit: trimToNull(row.unit) ?? undefined,
      notes: trimToNull(row.notes) ?? undefined,
    });
    indexes.push(index);
  }

  return { rows, fieldErrors, indexes };
}

function mapSteps(draft: RecipeEditorDraft): {
  rows: CreateRecipePayload['steps'];
  fieldErrors: Record<string, DraftFieldIssueCode>;
  indexes: number[];
} {
  const rows: CreateRecipePayload['steps'] = [];
  const fieldErrors: Record<string, DraftFieldIssueCode> = {};
  const indexes: number[] = [];

  for (const [index, row] of draft.steps.entries()) {
    if (isBlankStep(row)) {
      continue;
    }
    let rowInvalid = false;
    if (row.instruction.trim().length === 0) {
      fieldErrors[`steps.${index}.instruction`] = 'required';
      rowInvalid = true;
    }
    const duration = parseOptionalNonNegativeInt(row.durationMinutes);
    if (duration === 'invalid') {
      fieldErrors[`steps.${index}.durationMinutes`] = 'invalidNumber';
      rowInvalid = true;
    }
    if (rowInvalid || duration === 'invalid') {
      continue;
    }
    rows.push({
      position: rows.length + 1,
      instruction: row.instruction.trim(),
      durationMinutes: duration ?? undefined,
    });
    indexes.push(index);
  }

  return { rows, fieldErrors, indexes };
}

function mapTags(draft: RecipeEditorDraft): {
  tags: CreateRecipePayload['tags'];
  indexes: number[];
} {
  const tags: CreateRecipePayload['tags'] = [];
  const indexes: number[] = [];
  for (const [index, tag] of draft.tags.entries()) {
    const name = tag.name.trim();
    if (name.length === 0) {
      continue;
    }
    indexes.push(index);
    if (tag.tagId) {
      tags.push({ tagId: tag.tagId });
    } else {
      tags.push({ name });
    }
  }
  return { tags, indexes };
}

type RecipeScalarFields = Omit<
  CreateRecipePayload,
  'ingredients' | 'steps' | 'tags' | 'translations' | 'ingredientTranslations' | 'stepTranslations'
>;

function mapCoreFields(draft: RecipeEditorDraft): {
  fields: RecipeScalarFields;
  fieldErrors: Record<string, DraftFieldIssueCode>;
} {
  const fieldErrors: Record<string, DraftFieldIssueCode> = {};
  const servings = parseOptionalPositiveNumber(draft.servings);
  if (servings === 'invalid') {
    fieldErrors.servings = 'invalidNumber';
  }
  const prepMinutes = parseOptionalNonNegativeInt(draft.prepMinutes);
  if (prepMinutes === 'invalid') {
    fieldErrors.prepMinutes = 'invalidNumber';
  }
  const cookMinutes = parseOptionalNonNegativeInt(draft.cookMinutes);
  if (cookMinutes === 'invalid') {
    fieldErrors.cookMinutes = 'invalidNumber';
  }

  return {
    fields: {
      title: draft.title.trim(),
      sourceLanguage: resolveSourceLanguageFromDraft(draft),
      description: trimToNull(draft.description),
      category: trimToNull(draft.category),
      servings: servings === 'invalid' ? null : servings,
      prepMinutes: prepMinutes === 'invalid' ? null : prepMinutes,
      cookMinutes: cookMinutes === 'invalid' ? null : cookMinutes,
      notes: trimToNull(draft.notes),
    },
    fieldErrors,
  };
}

function assembleDraft(draft: RecipeEditorDraft): {
  fields: RecipeScalarFields;
  ingredients: CreateRecipePayload['ingredients'];
  steps: CreateRecipePayload['steps'];
  tags: CreateRecipePayload['tags'];
  fieldErrors: Record<string, DraftFieldIssueCode>;
  indexes: DraftIndexes;
} {
  const core = mapCoreFields(draft);
  const ingredientRows = mapIngredients(draft);
  const stepRows = mapSteps(draft);
  const tagRows = mapTags(draft);
  return {
    fields: core.fields,
    ingredients: ingredientRows.rows,
    steps: stepRows.rows,
    tags: tagRows.tags,
    fieldErrors: {
      ...core.fieldErrors,
      ...ingredientRows.fieldErrors,
      ...stepRows.fieldErrors,
    },
    indexes: {
      ingredients: ingredientRows.indexes,
      steps: stepRows.indexes,
      tags: tagRows.indexes,
    },
  };
}

export function draftToCreatePayload(
  draft: RecipeEditorDraft,
): BuiltRecipePayload<CreateRecipePayload> {
  const assembled = assembleDraft(draft);
  return {
    payload: {
      ...assembled.fields,
      ingredients: assembled.ingredients,
      steps: assembled.steps,
      tags: assembled.tags,
      translations: [],
      ingredientTranslations: [],
      stepTranslations: [],
    },
    fieldErrors: assembled.fieldErrors,
    indexes: assembled.indexes,
  };
}

export function draftToUpdatePayload(
  draft: RecipeEditorDraft,
  preserved: PreservedTranslationCollections,
): BuiltRecipePayload<UpdateRecipePayload> {
  const assembled = assembleDraft(draft);
  return {
    payload: {
      ...assembled.fields,
      ingredients: assembled.ingredients,
      steps: assembled.steps,
      tags: assembled.tags,
      translations: preserved.translations,
      ingredientTranslations: preserved.ingredientTranslations,
      stepTranslations: preserved.stepTranslations,
      changeSummary: null,
    },
    fieldErrors: assembled.fieldErrors,
    indexes: assembled.indexes,
  };
}

export function validateCreatePayload(payload: CreateRecipePayload) {
  return createRecipePayloadSchema.safeParse(payload);
}

export function validateUpdatePayload(payload: UpdateRecipePayload) {
  return updateRecipePayloadSchema.safeParse(payload);
}
