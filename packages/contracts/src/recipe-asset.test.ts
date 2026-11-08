import { describe, expect, it } from 'vitest';

import { createRecipeUploadSlotInputSchema } from './recipe-asset.js';

const FAMILY_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const RECIPE_ID = 'eeeeeeee-eeee-4eee-8eee-eeeeeeee0101';

function slot(overrides: Record<string, unknown> = {}) {
  return {
    familyId: FAMILY_ID,
    recipeId: RECIPE_ID,
    assetKind: 'recipe_photo',
    declaredMimeType: 'image/jpeg',
    declaredByteSize: 1000,
    ...overrides,
  };
}

describe('createRecipeUploadSlotInputSchema', () => {
  it('accepts a photo and a PDF document', () => {
    expect(createRecipeUploadSlotInputSchema.safeParse(slot()).success).toBe(true);
    expect(
      createRecipeUploadSlotInputSchema.safeParse(
        slot({
          assetKind: 'original_document',
          declaredMimeType: 'application/pdf',
          originalFilename: null,
        }),
      ).success,
    ).toBe(true);
  });

  it('rejects a photo declared as a PDF and a document that is not a PDF', () => {
    expect(
      createRecipeUploadSlotInputSchema.safeParse(slot({ declaredMimeType: 'application/pdf' }))
        .success,
    ).toBe(false);
    expect(
      createRecipeUploadSlotInputSchema.safeParse(
        slot({ assetKind: 'original_document', declaredMimeType: 'image/png' }),
      ).success,
    ).toBe(false);
  });

  it('rejects filenames with slashes or control characters', () => {
    expect(
      createRecipeUploadSlotInputSchema.safeParse(slot({ originalFilename: 'a/b.jpg' })).success,
    ).toBe(false);
    expect(
      createRecipeUploadSlotInputSchema.safeParse(slot({ originalFilename: 'a\u0000.jpg' }))
        .success,
    ).toBe(false);
    expect(
      createRecipeUploadSlotInputSchema.safeParse(slot({ originalFilename: 'photo.jpg' })).success,
    ).toBe(true);
  });
});
