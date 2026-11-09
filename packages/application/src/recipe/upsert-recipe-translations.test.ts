import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../profile/ensure-profile-for-user.js', () => ({
  loadVerifiedAuthUser: vi.fn(),
}));

vi.mock('@family-cookbook/data-access', () => ({
  getFamilyWorkspaceForMember: vi.fn(),
  getRecipeHeader: vi.fn(),
  upsertRecipeTranslationsRpc: vi.fn(),
}));

import {
  getFamilyWorkspaceForMember,
  getRecipeHeader,
  upsertRecipeTranslationsRpc,
} from '@family-cookbook/data-access';

import { loadVerifiedAuthUser } from '../profile/ensure-profile-for-user.js';
import { upsertRecipeTranslations } from './upsert-recipe-translations.js';

const FAMILY_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const RECIPE_ID = 'eeeeeeee-eeee-4eee-8eee-eeeeeeee0101';
const EDITOR = '11111111-1111-4111-8111-111111111102';

const validInput = {
  familyId: FAMILY_ID,
  recipeId: RECIPE_ID,
  expectedVersion: 1,
  languageTag: 'en',
  translation: {
    title: 'English title',
    ingredients: [{ ingredientPosition: 1, languageTag: 'en', name: 'Flour' }],
    steps: [{ stepPosition: 1, languageTag: 'en', instruction: 'Mix' }],
  },
};

describe('upsertRecipeTranslations', () => {
  beforeEach(() => {
    vi.mocked(loadVerifiedAuthUser).mockResolvedValue({
      status: 'ok',
      userId: EDITOR,
      email: 'editor@test.test',
    });
    vi.mocked(getFamilyWorkspaceForMember).mockResolvedValue({
      ok: true,
      workspace: {
        id: FAMILY_ID,
        name: 'A',
        defaultLanguage: 'en',
        role: 'editor',
        memberCount: 3,
      },
    });
    vi.mocked(getRecipeHeader).mockResolvedValue({
      ok: true,
      header: {
        id: RECIPE_ID,
        familyId: FAMILY_ID,
        createdBy: EDITOR,
        sourceLanguage: 'fi',
        version: 1,
        status: 'active',
      },
    });
  });

  it('rejects translation in source language', async () => {
    const result = await upsertRecipeTranslations({} as never, {
      ...validInput,
      languageTag: 'fi',
      translation: { ...validInput.translation },
    });
    expect(result.status).toBe('validation_error');

    const mixedCase = await upsertRecipeTranslations({} as never, {
      ...validInput,
      languageTag: 'FI',
      translation: {
        ...validInput.translation,
        ingredients: [{ ingredientPosition: 1, languageTag: 'FI', name: 'Flour' }],
        steps: [{ stepPosition: 1, languageTag: 'FI', instruction: 'Mix' }],
      },
    });
    expect(mixedCase.status).toBe('validation_error');
    expect(upsertRecipeTranslationsRpc).not.toHaveBeenCalled();
  });

  it('returns ok on rpc success', async () => {
    vi.mocked(upsertRecipeTranslationsRpc).mockResolvedValue({
      ok: true,
      recipeId: RECIPE_ID,
      version: 2,
    });
    const result = await upsertRecipeTranslations({} as never, validInput);
    expect(result).toEqual({ status: 'ok', recipeId: RECIPE_ID, version: 2 });
  });
});
