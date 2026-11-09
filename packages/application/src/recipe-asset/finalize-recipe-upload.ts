import {
  finalizeRecipeUploadInputSchema,
  finalizeRecipeUploadResultSchema,
  recipeAssetMimeTypeSchema,
  type FinalizeRecipeUploadResult,
} from '@family-cookbook/contracts';
import { validateUploadedBytes } from '@family-cookbook/domain';
import { canAttachRecipeAsset } from '@family-cookbook/permissions';
import {
  fetchStorageObjectForValidation,
  getFamilyWorkspaceForMember,
  getPendingRecipeAsset,
  getRecipeHeader,
  updateRecipeAssetAfterValidation,
  type AppSupabaseClient,
} from '@family-cookbook/data-access';

import { enforceRateLimit } from '../security/enforce-rate-limit.js';
import { loadVerifiedAuthUser } from '../profile/ensure-profile-for-user.js';

export type FinalizeRecipeUploadUseCaseResult =
  | { status: 'auth_required' }
  | { status: 'validation_error' }
  | { status: 'forbidden' }
  | { status: 'not_found' }
  | { status: 'rejected' }
  | { status: 'rate_limited'; retryAfterSeconds: number }
  | { status: 'finalize_failed' }
  | { status: 'ok'; result: FinalizeRecipeUploadResult };

export async function finalizeRecipeUpload(
  client: AppSupabaseClient,
  rawInput: unknown,
): Promise<FinalizeRecipeUploadUseCaseResult> {
  const auth = await loadVerifiedAuthUser(client);
  if (auth.status !== 'ok') {
    return { status: 'auth_required' };
  }

  const parsed = finalizeRecipeUploadInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { status: 'validation_error' };
  }

  const workspace = await getFamilyWorkspaceForMember(client, parsed.data.familyId);
  if (!workspace.ok) {
    return { status: 'forbidden' };
  }

  const header = await getRecipeHeader(client, parsed.data.familyId, parsed.data.recipeId);
  if (!header.ok) {
    return header.error === 'not_found' ? { status: 'not_found' } : { status: 'finalize_failed' };
  }

  if (!canAttachRecipeAsset(workspace.workspace.role, auth.userId, header.header.createdBy)) {
    return { status: 'forbidden' };
  }

  const uploadKey = `${auth.userId}:${parsed.data.familyId}`;
  const limit = enforceRateLimit('upload_finalize', uploadKey);
  if (!limit.ok) {
    return { status: 'rate_limited', retryAfterSeconds: limit.retryAfterSeconds };
  }

  const pending = await getPendingRecipeAsset(
    client,
    parsed.data.familyId,
    parsed.data.recipeId,
    parsed.data.assetId,
  );
  if (!pending.ok) {
    return pending.error === 'not_found' ? { status: 'not_found' } : { status: 'finalize_failed' };
  }

  const mimeParsed = recipeAssetMimeTypeSchema.safeParse(pending.asset.declaredMimeType);
  if (!mimeParsed.success) {
    const rejected = await updateRecipeAssetAfterValidation(
      client,
      pending.asset.id,
      pending.asset.familyId,
      { outcome: 'rejected' },
    );
    return rejected.ok ? { status: 'rejected' } : { status: 'finalize_failed' };
  }

  const fetched = await fetchStorageObjectForValidation(
    client,
    pending.asset.bucketId,
    pending.asset.objectPath,
    mimeParsed.data,
  );

  if (!fetched.ok) {
    const rejected = await updateRecipeAssetAfterValidation(
      client,
      pending.asset.id,
      pending.asset.familyId,
      { outcome: 'rejected' },
    );
    return rejected.ok ? { status: 'rejected' } : { status: 'finalize_failed' };
  }

  const validated = validateUploadedBytes({
    bytes: fetched.bytes,
    declaredMimeType: mimeParsed.data,
    declaredByteSize: pending.asset.declaredByteSize,
  });

  if (!validated.ok) {
    const rejected = await updateRecipeAssetAfterValidation(
      client,
      pending.asset.id,
      pending.asset.familyId,
      { outcome: 'rejected' },
    );
    return rejected.ok ? { status: 'rejected' } : { status: 'finalize_failed' };
  }

  const updated = await updateRecipeAssetAfterValidation(
    client,
    pending.asset.id,
    pending.asset.familyId,
    {
      outcome: 'available',
      detectedMimeType: validated.mimeType,
      byteSize: validated.byteSize,
      checksumSha256: validated.checksumSha256,
    },
  );

  if (!updated.ok) {
    return { status: 'finalize_failed' };
  }

  const result = {
    assetId: pending.asset.id,
    processingStatus: 'available' as const,
    detectedMimeType: validated.mimeType,
    byteSize: validated.byteSize,
    checksumSha256: validated.checksumSha256,
  };
  const output = finalizeRecipeUploadResultSchema.safeParse(result);
  if (!output.success) {
    return { status: 'finalize_failed' };
  }

  return { status: 'ok', result: output.data };
}
