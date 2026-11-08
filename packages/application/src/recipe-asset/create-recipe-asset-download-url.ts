import {
  recipeAssetDownloadInputSchema,
  recipeAssetDownloadResultSchema,
  type RecipeAssetDownloadResult,
} from '@family-cookbook/contracts';
import { safeRecipeAssetDownloadFilename } from '@family-cookbook/domain';
import { canViewRecipeAsset } from '@family-cookbook/permissions';
import {
  createRecipeSignedDownloadUrl,
  getAvailableRecipeAsset,
  getFamilyWorkspaceForMember,
  type AppSupabaseClient,
} from '@family-cookbook/data-access';

import { loadVerifiedAuthUser } from '../profile/ensure-profile-for-user.js';

export type CreateRecipeAssetDownloadUrlResult =
  | { status: 'auth_required' }
  | { status: 'validation_error' }
  | { status: 'forbidden' }
  | { status: 'not_found' }
  | { status: 'unavailable' }
  | { status: 'query_failed' }
  | { status: 'sign_failed' }
  | { status: 'ok'; result: RecipeAssetDownloadResult };

export async function createRecipeAssetDownloadUrl(
  client: AppSupabaseClient,
  rawInput: unknown,
): Promise<CreateRecipeAssetDownloadUrlResult> {
  const auth = await loadVerifiedAuthUser(client);
  if (auth.status !== 'ok') {
    return { status: 'auth_required' };
  }

  const parsed = recipeAssetDownloadInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { status: 'validation_error' };
  }

  const workspace = await getFamilyWorkspaceForMember(client, parsed.data.familyId);
  if (!workspace.ok) {
    return { status: 'forbidden' };
  }

  if (!canViewRecipeAsset(workspace.workspace.role)) {
    return { status: 'forbidden' };
  }

  const loaded = await getAvailableRecipeAsset(
    client,
    parsed.data.familyId,
    parsed.data.recipeId,
    parsed.data.assetId,
  );
  if (!loaded.ok) {
    if (loaded.error === 'not_found') {
      return { status: 'not_found' };
    }
    if (loaded.error === 'unavailable' || loaded.error === 'invalid_row') {
      return { status: 'unavailable' };
    }
    return { status: 'query_failed' };
  }

  const isPdf = loaded.asset.detectedMimeType === 'application/pdf';
  const signed = await createRecipeSignedDownloadUrl(client, loaded.asset.objectPath, {
    ...(isPdf
      ? {
          downloadFilename: safeRecipeAssetDownloadFilename(
            loaded.asset.originalFilename,
            loaded.asset.detectedMimeType,
          ),
        }
      : {}),
  });
  if (!signed.ok) {
    return { status: 'sign_failed' };
  }

  const result: RecipeAssetDownloadResult = {
    signedDownloadUrl: signed.signedUrl,
    expiresAt: signed.expiresAt,
    disposition: isPdf ? 'attachment' : 'inline',
    detectedMimeType: loaded.asset.detectedMimeType,
  };

  const output = recipeAssetDownloadResultSchema.safeParse(result);
  if (!output.success) {
    return { status: 'sign_failed' };
  }

  return { status: 'ok', result: output.data };
}
