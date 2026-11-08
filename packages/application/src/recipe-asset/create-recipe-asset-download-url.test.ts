import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../profile/ensure-profile-for-user.js', () => ({
  loadVerifiedAuthUser: vi.fn(),
}));

vi.mock('@family-cookbook/data-access', () => ({
  createRecipeSignedDownloadUrl: vi.fn(),
  getAvailableRecipeAsset: vi.fn(),
  getFamilyWorkspaceForMember: vi.fn(),
}));

import {
  createRecipeSignedDownloadUrl,
  getAvailableRecipeAsset,
  getFamilyWorkspaceForMember,
} from '@family-cookbook/data-access';

import { loadVerifiedAuthUser } from '../profile/ensure-profile-for-user.js';
import { createRecipeAssetDownloadUrl } from './create-recipe-asset-download-url.js';

const FAMILY_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const RECIPE_ID = 'eeeeeeee-eeee-4eee-8eee-eeeeeeee0001';
const ASSET_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001';
const USER_ID = '11111111-1111-4111-8111-111111111102';

const imageAsset = {
  id: ASSET_ID,
  familyId: FAMILY_ID,
  recipeId: RECIPE_ID,
  uploadedBy: USER_ID,
  bucketId: 'family-recipe-media',
  objectPath: `${FAMILY_ID}/${RECIPE_ID}/${ASSET_ID}/file`,
  assetKind: 'recipe_photo' as const,
  originalFilename: 'dish.jpg',
  detectedMimeType: 'image/jpeg' as const,
  byteSize: 1024,
  checksumSha256: 'a'.repeat(64),
  processingStatus: 'available' as const,
  createdAt: '2026-11-08T01:00:00.000Z',
  availableAt: '2026-11-08T01:01:00.000Z',
};

describe('createRecipeAssetDownloadUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadVerifiedAuthUser).mockResolvedValue({
      status: 'ok',
      userId: USER_ID,
      email: 'u@example.test',
    });
    vi.mocked(getFamilyWorkspaceForMember).mockResolvedValue({
      ok: true,
      workspace: {
        id: FAMILY_ID,
        name: 'Test',
        defaultLanguage: 'en',
        role: 'viewer',
        memberCount: 3,
      },
    });
  });

  it('returns inline URL for images', async () => {
    vi.mocked(getAvailableRecipeAsset).mockResolvedValue({ ok: true, asset: imageAsset });
    vi.mocked(createRecipeSignedDownloadUrl).mockResolvedValue({
      ok: true,
      signedUrl: 'https://storage.example/object',
      expiresAt: '2026-11-08T02:00:00.000Z',
    });

    const result = await createRecipeAssetDownloadUrl({} as never, {
      familyId: FAMILY_ID,
      recipeId: RECIPE_ID,
      assetId: ASSET_ID,
    });

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.result.disposition).toBe('inline');
    }
    expect(createRecipeSignedDownloadUrl).toHaveBeenCalledWith(
      expect.anything(),
      imageAsset.objectPath,
      {},
    );
  });

  it('returns attachment disposition for PDF', async () => {
    vi.mocked(getAvailableRecipeAsset).mockResolvedValue({
      ok: true,
      asset: {
        ...imageAsset,
        assetKind: 'original_document',
        detectedMimeType: 'application/pdf',
        originalFilename: 'scan.pdf',
      },
    });
    vi.mocked(createRecipeSignedDownloadUrl).mockResolvedValue({
      ok: true,
      signedUrl: 'https://storage.example/doc',
      expiresAt: '2026-11-08T02:00:00.000Z',
    });

    const result = await createRecipeAssetDownloadUrl({} as never, {
      familyId: FAMILY_ID,
      recipeId: RECIPE_ID,
      assetId: ASSET_ID,
    });

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.result.disposition).toBe('attachment');
    }
    expect(createRecipeSignedDownloadUrl).toHaveBeenCalledWith(
      expect.anything(),
      imageAsset.objectPath,
      expect.objectContaining({ downloadFilename: 'scan.pdf' }),
    );
  });

  it('reports a lookup failure instead of hiding it as not found', async () => {
    vi.mocked(getAvailableRecipeAsset).mockResolvedValue({ ok: false, error: 'query_failed' });

    const result = await createRecipeAssetDownloadUrl({} as never, {
      familyId: FAMILY_ID,
      recipeId: RECIPE_ID,
      assetId: ASSET_ID,
    });

    expect(result.status).toBe('query_failed');
    expect(createRecipeSignedDownloadUrl).not.toHaveBeenCalled();
  });

  it('rejects unavailable assets', async () => {
    vi.mocked(getAvailableRecipeAsset).mockResolvedValue({ ok: false, error: 'unavailable' });

    const result = await createRecipeAssetDownloadUrl({} as never, {
      familyId: FAMILY_ID,
      recipeId: RECIPE_ID,
      assetId: ASSET_ID,
    });

    expect(result.status).toBe('unavailable');
  });
});
