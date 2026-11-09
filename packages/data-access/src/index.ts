import { PACKAGE_VERSION as contractsVersion } from '@family-cookbook/contracts';

export const PACKAGE_VERSION = '0.0.0';

export const dataAccessBootstrapMarker = contractsVersion;

export {
  AUTH_REQUIRED_CODE,
  AuthRequiredError,
  getSessionUser,
  requireSessionUser,
} from './auth/session.js';
export type { SessionUser } from './auth/session.js';
export { sanitizeAuthRedirect } from './auth/redirect.js';
export { ensureProfile } from './profile/ensure-profile.js';
export type { EnsureProfileResult } from './profile/ensure-profile.js';
export { defaultProfileDisplayName } from './profile/display-name.js';
export {
  buildAuthCallbackUrl,
  getAppUrl,
  getPublicSupabaseEnv,
  getSupabaseAuthCookieOptions,
  resolveAuthAppOrigin,
} from './supabase/env.js';
export { createBrowserSupabaseClient } from './supabase/browser.js';
export { copySessionCookies, updateSession } from './supabase/middleware.js';
export { createServerSupabaseClient } from './supabase/server.js';
export type { AppSupabaseClient } from './supabase/server.js';
export { listRecipeAuditEvents } from './audit/list-recipe-audit-events.js';
export { countRecipeAssets } from './recipe-asset/count-recipe-assets.js';
export { createRecipeSignedDownloadUrl } from './recipe-asset/create-signed-download-url.js';
export { createRecipeSignedUploadUrl } from './recipe-asset/create-signed-upload-url.js';
export { getAvailableRecipeAsset } from './recipe-asset/get-available-recipe-asset.js';
export { fetchStorageObjectForValidation } from './recipe-asset/fetch-object-for-validation.js';
export { getPendingRecipeAsset } from './recipe-asset/get-pending-asset.js';
export { insertPendingRecipeAsset } from './recipe-asset/insert-pending-asset.js';
export { updateRecipeAssetAfterValidation } from './recipe-asset/update-asset-after-validation.js';
export { createFamilyBootstrap } from './family/create-family-bootstrap.js';
export { getFamilyWorkspaceForMember } from './family/get-family-workspace.js';
export {
  getLastSelectedFamilyId,
  updateLastSelectedFamilyId,
} from './family/last-selected-family.js';
export { listMyActiveFamilies } from './family/list-my-families.js';
export { listFamilyMemberDirectory } from './family/list-family-member-directory.js';
export { setFamilyMemberRole } from './family/set-family-member-role.js';
export { setFamilyMemberStatus } from './family/set-family-member-status.js';
export { transferFamilyOwnership } from './family/transfer-family-ownership.js';
export { hashInvitationToken } from './invitations/hash-token.js';
export { findPendingInvitationByEmail } from './invitations/find-pending-by-email.js';
export { insertFamilyInvitation } from './invitations/insert-invitation.js';
export { listPendingFamilyInvitations } from './invitations/list-pending.js';
export { redeemFamilyInvitation } from './invitations/redeem-invitation.js';
export { revokeFamilyInvitation } from './invitations/revoke-invitation.js';
export { createRecipeAggregate } from './recipe/create-recipe-aggregate.js';
export { getRecipeById } from './recipe/get-recipe.js';
export { getRecipeHeader, type RecipeHeader } from './recipe/get-recipe-header.js';
export { listRecipeRevisions } from './recipe/list-recipe-revisions.js';
export { searchRecipes } from './recipe/search-recipes.js';
export { setRecipeStatus } from './recipe/set-recipe-status.js';
export { updateRecipeAggregate } from './recipe/update-recipe-aggregate.js';
export { upsertRecipeTranslationsRpc } from './recipe/upsert-recipe-translations.js';
