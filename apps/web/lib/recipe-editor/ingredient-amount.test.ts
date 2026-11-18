import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { recipeIngredientInputSchema, type RecipeDetail } from '@family-cookbook/contracts';
import { describe, expect, it } from 'vitest';

import { locales } from '@/i18n/routing';

import { draftFromRecipeDetail, emptyRecipeEditorDraft, parseRecipeEditorDraftJson } from './draft';
import { draftPathFromSchemaPath, messageKeyForField } from './field-errors';
import { draftToUpdatePayload, ingredientAmountFields } from './map-payload';
import { parseIngredientLines, unitOptionsFromCatalog } from './parse-ingredient-lines';
import { formatAmountInput, INGREDIENT_QUANTITY_MAX, parseIngredientAmount } from './parse-numbers';

const NO_TRANSLATIONS = { translations: [], ingredientTranslations: [], stepTranslations: [] };

function detailWithIngredients(ingredients: RecipeDetail['ingredients']): RecipeDetail {
  const now = new Date().toISOString();
  return {
    id: '11111111-1111-4111-8111-111111111101',
    familyId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    title: 'Pancakes',
    sourceLanguage: 'en',
    category: null,
    status: 'active',
    version: 3,
    createdBy: '11111111-1111-4111-8111-111111111101',
    updatedBy: '11111111-1111-4111-8111-111111111101',
    updatedAt: now,
    createdAt: now,
    description: null,
    servings: null,
    prepMinutes: null,
    cookMinutes: null,
    notes: null,
    archivedAt: null,
    ingredients,
    steps: [{ position: 1, instruction: 'Mix.' }],
    tags: [],
    translations: [],
    assets: [],
    ingredientTranslations: [],
    stepTranslations: [],
  };
}

describe('parseIngredientAmount', () => {
  it.each([
    ['2', 2],
    ['1.5', 1.5],
    ['1,5', 1.5],
    ['1/2', 0.5],
    ['1 1/2', 1.5],
    [' 1  1/2 ', 1.5],
    ['3/2', 1.5],
    ['1/3', 0.3333],
    ['250', 250],
    ['0,25', 0.25],
  ])('reads %j as the number %d', (raw, expected) => {
    expect(parseIngredientAmount(raw)).toEqual({ kind: 'quantity', quantity: expected });
  });

  it.each([
    ['to taste', 'to taste'],
    ['2-3', '2-3'],
    ['0', '0'],
    ['1/0', '1/0'],
    ['1 3/2', '1 3/2'],
    ['½', '½'],
    ['a  pinch', 'a pinch'],
    ['100000000', '100000000'],
    ['0.00001', '0.00001'],
  ])('keeps %j as text', (raw, text) => {
    expect(parseIngredientAmount(raw)).toEqual({ kind: 'text', text });
  });

  it('treats blank input as empty', () => {
    expect(parseIngredientAmount('   ')).toEqual({ kind: 'empty' });
  });

  it('only produces numbers the shared contract accepts', () => {
    for (const raw of ['1/3', '2/7', '99999999.9999', '0,0001', '1 7/8']) {
      const parsed = parseIngredientAmount(raw);
      expect(parsed.kind).toBe('quantity');
      const quantity = parsed.kind === 'quantity' ? parsed.quantity : null;
      const result = recipeIngredientInputSchema.safeParse({ position: 1, name: 'x', quantity });
      expect(result.success).toBe(true);
    }
    const tooLarge = recipeIngredientInputSchema.safeParse({
      position: 1,
      name: 'x',
      quantity: INGREDIENT_QUANTITY_MAX + 1,
    });
    expect(tooLarge.success).toBe(false);
  });
});

describe('formatAmountInput', () => {
  it('uses the locale decimal mark and no grouping', () => {
    expect(formatAmountInput(1.5, 'en')).toBe('1.5');
    expect(formatAmountInput(1.5, 'fi')).toBe('1,5');
    expect(formatAmountInput(1.5, 'ru')).toBe('1,5');
    expect(formatAmountInput(12500, 'uk')).toBe('12500');
    expect(formatAmountInput(0.3333, 'en')).toBe('0.3333');
  });
});

describe('Amount field round trip', () => {
  const stored: RecipeDetail['ingredients'] = [
    { position: 1, name: 'Flour', quantity: 1.5, unit: 'cup' },
    { position: 2, name: 'Salt', quantityText: 'to taste' },
    { position: 3, name: 'Sugar', quantity: 2, quantityText: 'heaped', unit: 'tbsp' },
    { position: 4, name: 'Water', notes: 'warm' },
  ];

  it('loads each stored row into the single field', () => {
    const draft = draftFromRecipeDetail(detailWithIngredients(stored), 'fi');
    expect(draft.ingredients.map((row) => row.amount)).toEqual(['1,5', 'to taste', 'heaped', '']);
    expect(draft.ingredients[2]?.kept).toEqual({
      amount: 'heaped',
      quantity: 2,
      quantityText: 'heaped',
    });
    expect(draft.ingredients[3]?.notes).toBe('warm');
  });

  it('saves untouched rows back exactly as stored', () => {
    const draft = draftFromRecipeDetail(detailWithIngredients(stored), 'ru');
    const mapped = draftToUpdatePayload(draft, NO_TRANSLATIONS);
    expect(mapped.fieldErrors).toEqual({});
    expect(mapped.payload.ingredients).toEqual([
      { position: 1, name: 'Flour', quantity: 1.5, unit: 'cup', notes: undefined },
      { position: 2, name: 'Salt', quantityText: 'to taste', unit: undefined, notes: undefined },
      {
        position: 3,
        name: 'Sugar',
        quantity: 2,
        quantityText: 'heaped',
        unit: 'tbsp',
        notes: undefined,
      },
      { position: 4, name: 'Water', unit: undefined, notes: 'warm' },
    ]);
  });

  it('writes exactly one of number or text once the amount is edited', () => {
    const draft = draftFromRecipeDetail(detailWithIngredients(stored), 'en');
    const edited = {
      ...draft,
      ingredients: draft.ingredients.map((row, index) =>
        index === 2 ? { ...row, amount: '1 1/2' } : index === 1 ? { ...row, amount: '2' } : row,
      ),
    };
    const mapped = draftToUpdatePayload(edited, NO_TRANSLATIONS);
    expect(ingredientAmountFields(edited.ingredients[2]!)).toEqual({ quantity: 1.5 });
    expect(mapped.payload.ingredients[1]).toMatchObject({ quantity: 2 });
    expect(mapped.payload.ingredients[1]).not.toHaveProperty('quantityText');
    expect(mapped.payload.ingredients[2]).toMatchObject({ quantity: 1.5 });
    expect(mapped.payload.ingredients[2]).not.toHaveProperty('quantityText');
  });

  it('accepts drafts posted by the old two-field editor', () => {
    const legacy = JSON.stringify({
      ...emptyRecipeEditorDraft('en'),
      ingredients: [
        { clientKey: 'a', name: 'Milk', quantity: '2', quantityText: '', unit: 'dl', notes: '' },
        { clientKey: 'b', name: 'Salt', quantity: '', quantityText: 'pinch', unit: '', notes: '' },
      ],
    });
    const draft = parseRecipeEditorDraftJson(legacy);
    expect(draft?.ingredients.map((row) => row.amount)).toEqual(['2', 'pinch']);
  });

  it('drops a malformed kept pair', () => {
    const raw = JSON.stringify({
      ...emptyRecipeEditorDraft('en'),
      ingredients: [
        { clientKey: 'a', name: 'Sugar', amount: 'x', kept: { amount: 'x', quantity: 'big' } },
      ],
    });
    expect(parseRecipeEditorDraftJson(raw)?.ingredients[0]).not.toHaveProperty('kept');
  });

  it('shows schema errors for quantity or quantityText on the Amount field', () => {
    const indexes = { ingredients: [0, 3], steps: [], tags: [] };
    expect(draftPathFromSchemaPath('ingredients.1.quantityText', indexes)).toBe(
      'ingredients.3.amount',
    );
    expect(draftPathFromSchemaPath('recipe.ingredients.0.quantity', indexes)).toBe(
      'ingredients.0.amount',
    );
    expect(messageKeyForField('ingredients.3.amount', 'schema')).toBe('errors.amount');
  });
});

describe('parseIngredientLines', () => {
  const en = unitOptionsFromCatalog(
    'g|kg|ml|l|tsp|tbsp|cup|cups|pinch|clove|cloves|can|cans|piece|pieces',
  );
  const ru = unitOptionsFromCatalog('г|кг|мл|л|ч. л.|ст. л.|стакан|стакана|шт.|зубчика');

  it('splits amount, unit and name in English', () => {
    const text = [
      '200 g butter',
      '',
      '1 1/2 cups flour',
      '- 2-3 cloves garlic, crushed',
      'salt to taste',
      '200g sugar',
      '2 eggs',
      '1 lemon',
    ].join('\n');
    expect(parseIngredientLines(text, en, 50)).toEqual({
      truncated: false,
      rows: [
        { amount: '200', unit: 'g', name: 'butter' },
        { amount: '1 1/2', unit: 'cups', name: 'flour' },
        { amount: '2-3', unit: 'cloves', name: 'garlic, crushed' },
        { amount: '', unit: '', name: 'salt to taste' },
        { amount: '200', unit: 'g', name: 'sugar' },
        { amount: '2', unit: '', name: 'eggs' },
        { amount: '1', unit: '', name: 'lemon' },
      ],
    });
  });

  it('matches multi-word Russian units, with or without the space', () => {
    const text = '2 ст. л. сахара\r\n1 ч.л. соли\n1 л молока\n3 зубчика чеснока';
    expect(parseIngredientLines(text, ru, 50).rows).toEqual([
      { amount: '2', unit: 'ст. л.', name: 'сахара' },
      { amount: '1', unit: 'ч.л.', name: 'соли' },
      { amount: '1', unit: 'л', name: 'молока' },
      { amount: '3', unit: 'зубчика', name: 'чеснока' },
    ]);
  });

  it('stops at the limit and says so', () => {
    const result = parseIngredientLines('a\nb\n\nc\nd', en, 2);
    expect(result.rows.map((row) => row.name)).toEqual(['a', 'b']);
    expect(result.truncated).toBe(true);
    expect(parseIngredientLines('a\nb', en, 2).truncated).toBe(false);
  });
});

describe('editor catalogs', () => {
  const messagesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../messages');

  function keysOf(value: unknown, prefix = ''): string[] {
    if (typeof value !== 'object' || value === null) {
      return [prefix];
    }
    return Object.entries(value).flatMap(([key, child]) =>
      keysOf(child, prefix ? `${prefix}.${key}` : key),
    );
  }

  function editorCatalog(locale: string): Record<string, unknown> {
    const raw = readFileSync(path.join(messagesDir, `${locale}.json`), 'utf8');
    const json = JSON.parse(raw) as { recipes: { editor: Record<string, unknown> } };
    return json.recipes.editor;
  }

  it('has the same recipe editor keys in every UI locale', () => {
    const expected = keysOf(editorCatalog('en')).sort();
    for (const locale of locales) {
      expect(keysOf(editorCatalog(locale)).sort(), locale).toEqual(expected);
    }
  });

  it('offers unit suggestions in every UI locale', () => {
    for (const locale of locales) {
      const ingredients = editorCatalog(locale).ingredients as { unitOptions: string };
      expect(unitOptionsFromCatalog(ingredients.unitOptions).length, locale).toBeGreaterThan(5);
    }
  });
});
