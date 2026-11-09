import { describe, expect, it } from 'vitest';

import { parseArchiveLifecycleForm, parseRestoreLifecycleForm } from './recipe-lifecycle-form';

const FAMILY_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const RECIPE_ID = 'eeeeeeee-eeee-4eee-8eee-eeeeeeee0101';

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    data.set(key, value);
  }
  return data;
}

describe('parseArchiveLifecycleForm', () => {
  it('requires a checked confirmation before a valid archive', () => {
    expect(
      parseArchiveLifecycleForm(
        form({ familyId: FAMILY_ID, recipeId: RECIPE_ID, expectedVersion: '3' }),
      ),
    ).toEqual({ ok: false, reason: 'confirm_required' });

    expect(
      parseArchiveLifecycleForm(
        form({
          familyId: FAMILY_ID,
          recipeId: RECIPE_ID,
          expectedVersion: '3',
          confirm: 'true',
        }),
      ),
    ).toEqual({
      ok: true,
      input: {
        familyId: FAMILY_ID,
        recipeId: RECIPE_ID,
        expectedVersion: 3,
        confirm: true,
      },
    });
  });

  it('rejects a missing family or a non-integer version before checking confirmation', () => {
    expect(
      parseArchiveLifecycleForm(
        form({ familyId: 'nope', recipeId: RECIPE_ID, expectedVersion: '1', confirm: 'true' }),
      ),
    ).toEqual({ ok: false, reason: 'validation' });
    expect(
      parseArchiveLifecycleForm(
        form({
          familyId: FAMILY_ID,
          recipeId: RECIPE_ID,
          expectedVersion: '1.5',
          confirm: 'true',
        }),
      ),
    ).toEqual({ ok: false, reason: 'validation' });
  });
});

describe('parseRestoreLifecycleForm', () => {
  it('accepts a version without a confirmation flag', () => {
    expect(
      parseRestoreLifecycleForm(
        form({ familyId: FAMILY_ID, recipeId: RECIPE_ID, expectedVersion: '2' }),
      ),
    ).toEqual({
      ok: true,
      input: { familyId: FAMILY_ID, recipeId: RECIPE_ID, expectedVersion: 2 },
    });
  });
});
