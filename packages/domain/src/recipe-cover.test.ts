import { describe, expect, it } from 'vitest';

import { pickRecipeCoverAssetId, RECIPE_COVER_ASSET_KINDS } from './recipe-cover.js';

const photo = {
  id: '00000000-0000-4000-8000-000000000001',
  assetKind: 'recipe_photo',
  processingStatus: 'available',
  detectedMimeType: 'image/jpeg',
  createdAt: '2026-11-10T12:00:00.000Z',
} as const;

describe('pickRecipeCoverAssetId', () => {
  it('uses only dish photo kinds', () => {
    expect(RECIPE_COVER_ASSET_KINDS).toEqual(['recipe_photo', 'original_photo']);
  });

  it('returns null when the only image is a step photo', () => {
    expect(
      pickRecipeCoverAssetId([
        { ...photo, id: '00000000-0000-4000-8000-000000000002', assetKind: 'step_photo' },
      ]),
    ).toBeNull();
  });

  it('skips documents, pending files, and non-images', () => {
    expect(
      pickRecipeCoverAssetId([
        { ...photo, assetKind: 'original_document', detectedMimeType: 'application/pdf' },
        { ...photo, id: '00000000-0000-4000-8000-000000000003', processingStatus: 'pending' },
        {
          ...photo,
          id: '00000000-0000-4000-8000-000000000004',
          detectedMimeType: 'application/pdf',
        },
      ]),
    ).toBeNull();
  });

  it('picks the earliest dish photo and breaks ties by id', () => {
    const later = {
      ...photo,
      id: '00000000-0000-4000-8000-000000000009',
      createdAt: '2026-11-10T13:00:00.000Z',
    };
    const earlierB = {
      ...photo,
      id: '00000000-0000-4000-8000-000000000008',
      assetKind: 'original_photo',
      createdAt: '2026-11-10T11:00:00.000Z',
    };
    const earlierA = {
      ...photo,
      id: '00000000-0000-4000-8000-000000000007',
      createdAt: '2026-11-10T11:00:00.000Z',
    };
    expect(pickRecipeCoverAssetId([later, earlierB, earlierA])).toBe(earlierA.id);
  });
});
