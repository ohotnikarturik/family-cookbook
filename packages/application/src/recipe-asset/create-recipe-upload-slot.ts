import {
  createRecipeUploadSlotInputSchema,
  createRecipeUploadSlotResultSchema,
  RECIPE_ASSETS_PER_RECIPE_MAX,
  type CreateRecipeUploadSlotResult,
} from '@family-cookbook/contracts';
import { canAttachRecipeAsset } from '@family-cookbook/permissions';
import {
  countRecipeAssets,
  createRecipeSignedUploadUrl,
  getFamilyWorkspaceForMember,
  getRecipeHeader,
  insertPendingRecipeAsset,
  updateRecipeAssetAfterValidation,
  type AppSupabaseClient,
} from '@family-cookbook/data-access';

import { loadVerifiedAuthUser } from '../profile/ensure-profile-for-user.js';

export type CreateRecipeUploadSlotUseCaseResult =
  | { status: 'auth_required' }
  | { status: 'validation_error' }
  | { status: 'forbidden' }
  | { status: 'not_found' }
  | { status: 'limit_reached' }
  | { status: 'slot_failed' }
  | { status: 'ok'; result: CreateRecipeUploadSlotResult };

export async function createRecipeUploadSlot(
  client: AppSupabaseClient,
  rawInput: unknown,
): Promise<CreateRecipeUploadSlotUseCaseResult> {
  const auth = await loadVerifiedAuthUser(client);
  if (auth.status !== 'ok') {
    return { status: 'auth_required' };
  }

  const parsed = createRecipeUploadSlotInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { status: 'validation_error' };
  }

  const workspace = await getFamilyWorkspaceForMember(client, parsed.data.familyId);
  if (!workspace.ok) {
    return { status: 'forbidden' };
  }

  const header = await getRecipeHeader(client, parsed.data.familyId, parsed.data.recipeId);
  if (!header.ok) {
    return header.error === 'not_found' ? { status: 'not_found' } : { status: 'slot_failed' };
  }

  if (!canAttachRecipeAsset(workspace.workspace.role, auth.userId, header.header.createdBy)) {
    return { status: 'forbidden' };
  }

  const counted = await countRecipeAssets(client, parsed.data.familyId, parsed.data.recipeId);
  if (!counted.ok) {
    return { status: 'slot_failed' };
  }
  if (counted.count >= RECIPE_ASSETS_PER_RECIPE_MAX) {
    return { status: 'limit_reached' };
  }

  const inserted = await insertPendingRecipeAsset(client, {
    familyId: parsed.data.familyId,
    recipeId: parsed.data.recipeId,
    uploadedBy: auth.userId,
    assetKind: parsed.data.assetKind,
    originalFilename: parsed.data.originalFilename ?? null,
    declaredMimeType: parsed.data.declaredMimeType,
    declaredByteSize: parsed.data.declaredByteSize,
  });

  if (!inserted.ok) {
    if (inserted.error === 'limit_exceeded') {
      return { status: 'limit_reached' };
    }
    return { status: 'slot_failed' };
  }

  const signed = await createRecipeSignedUploadUrl(client, inserted.objectPath);
  if (!signed.ok) {
    await updateRecipeAssetAfterValidation(client, inserted.assetId, parsed.data.familyId, {
      outcome: 'rejected',
    });
    return { status: 'slot_failed' };
  }

  const result = {
    assetId: inserted.assetId,
    objectPath: inserted.objectPath,
    signedUploadUrl: signed.signedUrl,
    expiresAt: signed.expiresAt,
  };
  const validated = createRecipeUploadSlotResultSchema.safeParse(result);
  if (!validated.success) {
    await updateRecipeAssetAfterValidation(client, inserted.assetId, parsed.data.familyId, {
      outcome: 'rejected',
    });
    return { status: 'slot_failed' };
  }

  return { status: 'ok', result: validated.data };
}
