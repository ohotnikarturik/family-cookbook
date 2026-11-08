import { describe, expect, it } from 'vitest';

import { mapRecipeDetailRow } from './map-recipe-detail.js';

const FAMILY_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const RECIPE_ID = 'eeeeeeee-eeee-4eee-8eee-eeeeeeee0001';
const USER_ID = '11111111-1111-4111-8111-111111111102';

describe('mapRecipeDetailRow', () => {
  it('coerces numeric columns returned as strings', () => {
    const mapped = mapRecipeDetailRow({
      id: RECIPE_ID,
      family_id: FAMILY_ID,
      created_by: USER_ID,
      updated_by: USER_ID,
      title: 'Soup',
      description: null,
      source_language: 'fi',
      category: null,
      servings: '4.50',
      prep_minutes: 10,
      cook_minutes: null,
      notes: null,
      status: 'active',
      version: 1,
      created_at: '2026-11-08T01:00:00.000Z',
      updated_at: '2026-11-08T01:00:00.000Z',
      archived_at: null,
      recipe_ingredients: [
        {
          position: 1,
          name: 'Water',
          quantity: '1.2500',
          quantity_text: null,
          unit: 'l',
          notes: null,
        },
      ],
      recipe_steps: [],
      recipe_tags: [],
      recipe_translations: [],
      recipe_assets: [],
    });

    expect(mapped?.servings).toBe(4.5);
    expect(mapped?.ingredients[0]?.quantity).toBe(1.25);
  });
});
