import { describe, expect, it } from 'vitest';

import {
  canArchiveRecipe,
  canCreateRecipe,
  canEditRecipe,
  canManageRecipeTags,
  canRestoreRecipe,
  canViewRecipeHistory,
  canViewRecipes,
} from './recipe-capabilities.js';

const CONTRIBUTOR_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const CONTRIBUTOR_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

describe('recipe capability matrix', () => {
  it('allows every role to view recipes', () => {
    for (const role of ['owner', 'admin', 'editor', 'contributor', 'viewer'] as const) {
      expect(canViewRecipes(role)).toBe(true);
    }
  });

  it('blocks viewers from creating recipes', () => {
    expect(canCreateRecipe('viewer')).toBe(false);
    expect(canCreateRecipe('contributor')).toBe(true);
    expect(canCreateRecipe('editor')).toBe(true);
  });

  it('lets contributors edit only their own recipes', () => {
    expect(canEditRecipe('contributor', CONTRIBUTOR_A, CONTRIBUTOR_A)).toBe(true);
    expect(canEditRecipe('contributor', CONTRIBUTOR_A, CONTRIBUTOR_B)).toBe(false);
    expect(canEditRecipe('editor', CONTRIBUTOR_A, CONTRIBUTOR_B)).toBe(true);
    expect(canEditRecipe('viewer', CONTRIBUTOR_A, CONTRIBUTOR_A)).toBe(false);
  });

  it('restricts recipe history for viewers and foreign contributors', () => {
    expect(canViewRecipeHistory('viewer', CONTRIBUTOR_A, CONTRIBUTOR_A)).toBe(false);
    expect(canViewRecipeHistory('contributor', CONTRIBUTOR_A, CONTRIBUTOR_B)).toBe(false);
    expect(canViewRecipeHistory('contributor', CONTRIBUTOR_A, CONTRIBUTOR_A)).toBe(true);
    expect(canViewRecipeHistory('admin', CONTRIBUTOR_A, CONTRIBUTOR_B)).toBe(true);
  });

  it('mirrors edit rules for archive and restore', () => {
    expect(canArchiveRecipe('contributor', CONTRIBUTOR_A, CONTRIBUTOR_A)).toBe(true);
    expect(canArchiveRecipe('contributor', CONTRIBUTOR_A, CONTRIBUTOR_B)).toBe(false);
    expect(canRestoreRecipe('viewer', CONTRIBUTOR_A, CONTRIBUTOR_A)).toBe(false);
    expect(canRestoreRecipe('editor', CONTRIBUTOR_A, CONTRIBUTOR_B)).toBe(true);
  });

  it('lets only editor-and-above manage family tags', () => {
    expect(canManageRecipeTags('editor')).toBe(true);
    expect(canManageRecipeTags('contributor')).toBe(false);
    expect(canManageRecipeTags('viewer')).toBe(false);
  });
});
