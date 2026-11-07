import type { AppSupabaseClient } from '@family-cookbook/data-access';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const FAMILY_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const RECIPE_A = 'eeeeeeee-eeee-4eee-8eee-eeeeeeee0001';
const VIEWER_A = '11111111-1111-4111-8111-111111111103';
const CONTRIBUTOR_B = '22222222-2222-4222-8222-222222222202';
const OWNER_B = '22222222-2222-4222-8222-222222222201';

vi.mock('@family-cookbook/data-access', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@family-cookbook/data-access')>();
  return {
    ...actual,
    getFamilyWorkspaceForMember: vi.fn(),
    createRecipeAggregate: vi.fn(),
    getRecipeHeader: vi.fn(),
    updateRecipeAggregate: vi.fn(),
  };
});

vi.mock('../profile/ensure-profile-for-user.js', () => ({
  loadVerifiedAuthUser: vi.fn(),
}));

import {
  createRecipeAggregate,
  getFamilyWorkspaceForMember,
  getRecipeHeader,
  updateRecipeAggregate,
} from '@family-cookbook/data-access';
import { loadVerifiedAuthUser } from '../profile/ensure-profile-for-user.js';
import { archiveRecipe } from './archive-recipe.js';
import { createRecipe } from './create-recipe.js';
import { updateRecipe } from './update-recipe.js';

const mockClient = {} as AppSupabaseClient;

describe('createRecipe', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('forbids viewers', async () => {
    vi.mocked(loadVerifiedAuthUser).mockResolvedValue({
      status: 'ok',
      userId: VIEWER_A,
      email: 'viewer@test.test',
    });
    vi.mocked(getFamilyWorkspaceForMember).mockResolvedValue({
      ok: true,
      workspace: {
        id: FAMILY_A,
        name: 'A',
        defaultLanguage: 'en',
        role: 'viewer',
        memberCount: 3,
      },
    });

    const result = await createRecipe(mockClient, {
      familyId: FAMILY_A,
      recipe: { title: 'Blocked', sourceLanguage: 'en' },
    });

    expect(result).toEqual({ status: 'forbidden' });
    expect(createRecipeAggregate).not.toHaveBeenCalled();
  });

  it('allows editors to create', async () => {
    vi.mocked(loadVerifiedAuthUser).mockResolvedValue({
      status: 'ok',
      userId: '11111111-1111-4111-8111-111111111102',
      email: 'editor@test.test',
    });
    vi.mocked(getFamilyWorkspaceForMember).mockResolvedValue({
      ok: true,
      workspace: {
        id: FAMILY_A,
        name: 'A',
        defaultLanguage: 'en',
        role: 'editor',
        memberCount: 3,
      },
    });
    vi.mocked(createRecipeAggregate).mockResolvedValue({
      ok: true,
      recipeId: RECIPE_A,
      version: 1,
    });

    const result = await createRecipe(mockClient, {
      familyId: FAMILY_A,
      recipe: {
        title: 'Soup',
        sourceLanguage: 'fi',
        ingredients: [],
        steps: [],
        tags: [],
        translations: [],
        ingredientTranslations: [],
        stepTranslations: [],
      },
    });

    expect(result).toEqual({ status: 'ok', recipeId: RECIPE_A, version: 1 });
  });
});

describe('updateRecipe', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('forbids contributors on another members recipe', async () => {
    vi.mocked(loadVerifiedAuthUser).mockResolvedValue({
      status: 'ok',
      userId: CONTRIBUTOR_B,
      email: 'c@test.test',
    });
    vi.mocked(getFamilyWorkspaceForMember).mockResolvedValue({
      ok: true,
      workspace: {
        id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        name: 'B',
        defaultLanguage: 'en',
        role: 'contributor',
        memberCount: 2,
      },
    });
    vi.mocked(getRecipeHeader).mockResolvedValue({
      ok: true,
      header: {
        id: RECIPE_A,
        familyId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        createdBy: OWNER_B,
        version: 1,
        status: 'active',
      },
    });

    const result = await updateRecipe(mockClient, {
      familyId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      recipeId: RECIPE_A,
      expectedVersion: 1,
      recipe: {
        title: 'Nope',
        sourceLanguage: 'en',
        ingredients: [],
        steps: [],
        tags: [],
        translations: [],
        ingredientTranslations: [],
        stepTranslations: [],
      },
    });

    expect(result).toEqual({ status: 'forbidden' });
    expect(updateRecipeAggregate).not.toHaveBeenCalled();
  });

  it('surfaces version conflicts', async () => {
    vi.mocked(loadVerifiedAuthUser).mockResolvedValue({
      status: 'ok',
      userId: '11111111-1111-4111-8111-111111111102',
      email: 'editor@test.test',
    });
    vi.mocked(getFamilyWorkspaceForMember).mockResolvedValue({
      ok: true,
      workspace: {
        id: FAMILY_A,
        name: 'A',
        defaultLanguage: 'en',
        role: 'editor',
        memberCount: 3,
      },
    });
    vi.mocked(getRecipeHeader).mockResolvedValue({
      ok: true,
      header: {
        id: RECIPE_A,
        familyId: FAMILY_A,
        createdBy: OWNER_B,
        version: 3,
        status: 'active',
      },
    });
    vi.mocked(updateRecipeAggregate).mockResolvedValue({
      ok: false,
      error: 'version_conflict',
      currentVersion: 3,
    });

    const result = await updateRecipe(mockClient, {
      familyId: FAMILY_A,
      recipeId: RECIPE_A,
      expectedVersion: 2,
      recipe: {
        title: 'Stale',
        sourceLanguage: 'en',
        ingredients: [],
        steps: [],
        tags: [],
        translations: [],
        ingredientTranslations: [],
        stepTranslations: [],
      },
    });

    expect(result).toEqual({ status: 'version_conflict', currentVersion: 3 });
  });
});

describe('archiveRecipe', () => {
  it('requires confirm true in schema', async () => {
    const result = await archiveRecipe(mockClient, {
      familyId: FAMILY_A,
      recipeId: RECIPE_A,
      expectedVersion: 1,
      confirm: false,
    });
    expect(result).toEqual({ status: 'validation_error' });
  });
});
