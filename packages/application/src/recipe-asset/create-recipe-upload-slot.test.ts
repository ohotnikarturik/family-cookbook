import type { AppSupabaseClient } from '@family-cookbook/data-access';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const FAMILY_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const RECIPE_A = 'eeeeeeee-eeee-4eee-8eee-eeeeeeee0101';
const CONTRIBUTOR_A = '11111111-1111-4111-8111-111111111104';

vi.mock('@family-cookbook/data-access', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@family-cookbook/data-access')>();
  return {
    ...actual,
    countRecipeAssets: vi.fn(),
    createRecipeSignedUploadUrl: vi.fn(),
    getFamilyWorkspaceForMember: vi.fn(),
    getRecipeHeader: vi.fn(),
    insertPendingRecipeAsset: vi.fn(),
    updateRecipeAssetAfterValidation: vi.fn(),
  };
});

vi.mock('../profile/ensure-profile-for-user.js', () => ({
  loadVerifiedAuthUser: vi.fn(),
}));

import {
  countRecipeAssets,
  createRecipeSignedUploadUrl,
  getFamilyWorkspaceForMember,
  getRecipeHeader,
  insertPendingRecipeAsset,
  updateRecipeAssetAfterValidation,
} from '@family-cookbook/data-access';
import { loadVerifiedAuthUser } from '../profile/ensure-profile-for-user.js';
import { createRecipeUploadSlot } from './create-recipe-upload-slot.js';

const mockClient = {} as AppSupabaseClient;

describe('createRecipeUploadSlot', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('forbids viewers', async () => {
    vi.mocked(loadVerifiedAuthUser).mockResolvedValue({
      status: 'ok',
      userId: '11111111-1111-4111-8111-111111111103',
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
    vi.mocked(getRecipeHeader).mockResolvedValue({
      ok: true,
      header: {
        id: RECIPE_A,
        familyId: FAMILY_A,
        createdBy: CONTRIBUTOR_A,
        sourceLanguage: 'en',
        version: 1,
        status: 'active',
      },
    });

    const result = await createRecipeUploadSlot(mockClient, {
      familyId: FAMILY_A,
      recipeId: RECIPE_A,
      assetKind: 'recipe_photo',
      declaredMimeType: 'image/jpeg',
      declaredByteSize: 1000,
    });

    expect(result).toEqual({ status: 'forbidden' });
    expect(insertPendingRecipeAsset).not.toHaveBeenCalled();
  });

  it('returns limit_reached when at cap', async () => {
    vi.mocked(loadVerifiedAuthUser).mockResolvedValue({
      status: 'ok',
      userId: CONTRIBUTOR_A,
      email: 'contributor@test.test',
    });
    vi.mocked(getFamilyWorkspaceForMember).mockResolvedValue({
      ok: true,
      workspace: {
        id: FAMILY_A,
        name: 'A',
        defaultLanguage: 'en',
        role: 'contributor',
        memberCount: 3,
      },
    });
    vi.mocked(getRecipeHeader).mockResolvedValue({
      ok: true,
      header: {
        id: RECIPE_A,
        familyId: FAMILY_A,
        createdBy: CONTRIBUTOR_A,
        sourceLanguage: 'en',
        version: 1,
        status: 'active',
      },
    });
    vi.mocked(countRecipeAssets).mockResolvedValue({ ok: true, count: 10 });

    const result = await createRecipeUploadSlot(mockClient, {
      familyId: FAMILY_A,
      recipeId: RECIPE_A,
      assetKind: 'recipe_photo',
      declaredMimeType: 'image/jpeg',
      declaredByteSize: 1000,
    });

    expect(result).toEqual({ status: 'limit_reached' });
  });

  it('returns signed slot on success', async () => {
    vi.mocked(loadVerifiedAuthUser).mockResolvedValue({
      status: 'ok',
      userId: CONTRIBUTOR_A,
      email: 'contributor@test.test',
    });
    vi.mocked(getFamilyWorkspaceForMember).mockResolvedValue({
      ok: true,
      workspace: {
        id: FAMILY_A,
        name: 'A',
        defaultLanguage: 'en',
        role: 'contributor',
        memberCount: 3,
      },
    });
    vi.mocked(getRecipeHeader).mockResolvedValue({
      ok: true,
      header: {
        id: RECIPE_A,
        familyId: FAMILY_A,
        createdBy: CONTRIBUTOR_A,
        sourceLanguage: 'en',
        version: 1,
        status: 'active',
      },
    });
    vi.mocked(countRecipeAssets).mockResolvedValue({ ok: true, count: 0 });
    vi.mocked(insertPendingRecipeAsset).mockResolvedValue({
      ok: true,
      assetId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0b01',
      objectPath: 'path/to/file',
    });
    vi.mocked(createRecipeSignedUploadUrl).mockResolvedValue({
      ok: true,
      signedUrl: 'https://storage.example/upload',
      expiresAt: '2026-11-08T12:00:00.000Z',
    });

    const result = await createRecipeUploadSlot(mockClient, {
      familyId: FAMILY_A,
      recipeId: RECIPE_A,
      assetKind: 'recipe_photo',
      declaredMimeType: 'image/jpeg',
      declaredByteSize: 1000,
    });

    expect(result.status).toBe('ok');
    expect(updateRecipeAssetAfterValidation).not.toHaveBeenCalled();
  });

  it('rejects a photo declared as a PDF before inserting a slot', async () => {
    vi.mocked(loadVerifiedAuthUser).mockResolvedValue({
      status: 'ok',
      userId: CONTRIBUTOR_A,
      email: 'contributor@test.test',
    });

    const result = await createRecipeUploadSlot(mockClient, {
      familyId: FAMILY_A,
      recipeId: RECIPE_A,
      assetKind: 'recipe_photo',
      declaredMimeType: 'application/pdf',
      declaredByteSize: 1000,
    });

    expect(result).toEqual({ status: 'validation_error' });
    expect(insertPendingRecipeAsset).not.toHaveBeenCalled();
  });

  it('marks the slot rejected when the signed URL cannot be minted', async () => {
    vi.mocked(loadVerifiedAuthUser).mockResolvedValue({
      status: 'ok',
      userId: CONTRIBUTOR_A,
      email: 'contributor@test.test',
    });
    vi.mocked(getFamilyWorkspaceForMember).mockResolvedValue({
      ok: true,
      workspace: {
        id: FAMILY_A,
        name: 'A',
        defaultLanguage: 'en',
        role: 'contributor',
        memberCount: 3,
      },
    });
    vi.mocked(getRecipeHeader).mockResolvedValue({
      ok: true,
      header: {
        id: RECIPE_A,
        familyId: FAMILY_A,
        createdBy: CONTRIBUTOR_A,
        sourceLanguage: 'en',
        version: 1,
        status: 'active',
      },
    });
    vi.mocked(countRecipeAssets).mockResolvedValue({ ok: true, count: 0 });
    vi.mocked(insertPendingRecipeAsset).mockResolvedValue({
      ok: true,
      assetId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0b01',
      objectPath: 'path/to/file',
    });
    vi.mocked(createRecipeSignedUploadUrl).mockResolvedValue({ ok: false, error: 'sign_failed' });
    vi.mocked(updateRecipeAssetAfterValidation).mockResolvedValue({ ok: true });

    const result = await createRecipeUploadSlot(mockClient, {
      familyId: FAMILY_A,
      recipeId: RECIPE_A,
      assetKind: 'recipe_photo',
      declaredMimeType: 'image/jpeg',
      declaredByteSize: 1000,
    });

    expect(result).toEqual({ status: 'slot_failed' });
    expect(updateRecipeAssetAfterValidation).toHaveBeenCalledWith(
      mockClient,
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0b01',
      FAMILY_A,
      { outcome: 'rejected' },
    );
  });

  it('marks the slot rejected when the signed URL cannot be returned', async () => {
    vi.mocked(loadVerifiedAuthUser).mockResolvedValue({
      status: 'ok',
      userId: CONTRIBUTOR_A,
      email: 'contributor@test.test',
    });
    vi.mocked(getFamilyWorkspaceForMember).mockResolvedValue({
      ok: true,
      workspace: {
        id: FAMILY_A,
        name: 'A',
        defaultLanguage: 'en',
        role: 'contributor',
        memberCount: 3,
      },
    });
    vi.mocked(getRecipeHeader).mockResolvedValue({
      ok: true,
      header: {
        id: RECIPE_A,
        familyId: FAMILY_A,
        createdBy: CONTRIBUTOR_A,
        sourceLanguage: 'en',
        version: 1,
        status: 'active',
      },
    });
    vi.mocked(countRecipeAssets).mockResolvedValue({ ok: true, count: 0 });
    vi.mocked(insertPendingRecipeAsset).mockResolvedValue({
      ok: true,
      assetId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0b01',
      objectPath: 'path/to/file',
    });
    vi.mocked(createRecipeSignedUploadUrl).mockResolvedValue({
      ok: true,
      signedUrl: 'not-a-url',
      expiresAt: '2026-11-08T12:00:00.000Z',
    });
    vi.mocked(updateRecipeAssetAfterValidation).mockResolvedValue({ ok: true });

    const result = await createRecipeUploadSlot(mockClient, {
      familyId: FAMILY_A,
      recipeId: RECIPE_A,
      assetKind: 'recipe_photo',
      declaredMimeType: 'image/jpeg',
      declaredByteSize: 1000,
    });

    expect(result).toEqual({ status: 'slot_failed' });
    expect(updateRecipeAssetAfterValidation).toHaveBeenCalledWith(
      mockClient,
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0b01',
      FAMILY_A,
      { outcome: 'rejected' },
    );
  });
});
