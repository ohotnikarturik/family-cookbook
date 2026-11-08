import { describe, expect, it } from 'vitest';

import { draftPathFromSchemaPath } from './field-errors';
import { draftFromRecipeDetail, emptyRecipeEditorDraft, tagDraftWithName } from './draft';
import { draftToCreatePayload, draftToUpdatePayload } from './map-payload';
import type { PreservedTranslationCollections } from './types';

describe('draftToCreatePayload', () => {
  it('strips blank ingredient and step rows and renumbers positions', () => {
    const draft = emptyRecipeEditorDraft('en');
    const withRows = {
      ...draft,
      title: 'Test soup',
      ingredients: [
        { clientKey: 'a', name: 'Carrot', quantity: '', quantityText: '', unit: '', notes: '' },
        { clientKey: 'b', name: '', quantity: '', quantityText: '', unit: '', notes: '' },
        {
          clientKey: 'c',
          name: 'Salt',
          quantity: '',
          quantityText: 'to taste',
          unit: '',
          notes: '',
        },
      ],
      steps: [
        { clientKey: 's1', instruction: 'Chop vegetables.', durationMinutes: '' },
        { clientKey: 's2', instruction: '', durationMinutes: '' },
      ],
    };

    const mapped = draftToCreatePayload(withRows);
    expect(mapped.fieldErrors).toEqual({});
    expect(mapped.payload.ingredients.map((row) => row.position)).toEqual([1, 2]);
    expect(mapped.payload.ingredients[1]?.quantityText).toBe('to taste');
    expect(mapped.payload.steps).toHaveLength(1);
    expect(mapped.payload.steps[0]?.position).toBe(1);
  });

  it('keeps a row that has an amount but no name and accepts a decimal comma', () => {
    const draft = {
      ...emptyRecipeEditorDraft('fi'),
      title: 'Keitto',
      servings: '1,5',
      ingredients: [
        {
          clientKey: 'a',
          name: '',
          quantity: '2',
          quantityText: '',
          unit: 'dl',
          notes: '',
        },
      ],
      steps: [{ clientKey: 's1', instruction: '', durationMinutes: '5' }],
    };
    const mapped = draftToCreatePayload(draft);
    expect(mapped.payload.servings).toBe(1.5);
    expect(mapped.payload.ingredients).toHaveLength(0);
    expect(mapped.payload.steps).toHaveLength(0);
    expect(mapped.fieldErrors['ingredients.0.name']).toBe('required');
    expect(mapped.fieldErrors['steps.0.instruction']).toBe('required');
  });
});

describe('draftToUpdatePayload', () => {
  it('passes preserved translation collections through unchanged', () => {
    const preserved: PreservedTranslationCollections = {
      translations: [{ languageTag: 'fi', title: 'Finnish title' }],
      ingredientTranslations: [],
      stepTranslations: [],
    };
    const draft = { ...emptyRecipeEditorDraft('en'), title: 'Updated' };
    const mapped = draftToUpdatePayload(draft, preserved);
    expect(mapped.fieldErrors).toEqual({});
    expect(mapped.payload.translations).toEqual(preserved.translations);
    expect(mapped.payload.ingredientTranslations).toEqual([]);
    expect(mapped.payload.stepTranslations).toEqual([]);
  });
});

describe('draftFromRecipeDetail', () => {
  it('maps tags with ids for edit mode', () => {
    const detail = {
      id: '11111111-1111-4111-8111-111111111101',
      familyId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      title: 'Sample',
      sourceLanguage: 'fi',
      category: null,
      status: 'active' as const,
      version: 1,
      createdBy: '11111111-1111-4111-8111-111111111101',
      updatedBy: '11111111-1111-4111-8111-111111111101',
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      description: null,
      servings: null,
      prepMinutes: null,
      cookMinutes: null,
      notes: null,
      archivedAt: null,
      ingredients: [],
      steps: [],
      tags: [
        {
          id: '22222222-2222-4222-8222-222222222201',
          familyId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          name: 'dessert',
          normalizedName: 'dessert',
        },
      ],
      translations: [],
    };
    const draft = draftFromRecipeDetail(detail);
    expect(draft.tags[0]?.tagId).toBe('22222222-2222-4222-8222-222222222201');
    expect(draft.sourceLanguagePreset).toBe('fi');
  });
});

describe('tagDraftWithName', () => {
  it('drops the existing tag id when the name changes', () => {
    const renamed = tagDraftWithName(
      { clientKey: 't1', tagId: '22222222-2222-4222-8222-222222222201', name: 'dessert' },
      'weeknight',
    );
    expect(renamed).toEqual({ clientKey: 't1', name: 'weeknight' });
  });
});

describe('draftPathFromSchemaPath', () => {
  it('maps a filtered payload index back to the draft row', () => {
    expect(
      draftPathFromSchemaPath('recipe.ingredients.0.name', {
        ingredients: [2],
        steps: [],
        tags: [],
      }),
    ).toBe('ingredients.2.name');
  });
});
