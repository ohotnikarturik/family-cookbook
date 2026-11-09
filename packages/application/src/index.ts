import { PACKAGE_VERSION as contractsVersion } from '@family-cookbook/contracts';
import { PACKAGE_VERSION as domainVersion } from '@family-cookbook/domain';
import { PACKAGE_VERSION as permissionsVersion } from '@family-cookbook/permissions';

export const PACKAGE_VERSION = '0.0.0';

export const applicationBootstrapMarker = {
  contracts: contractsVersion,
  domain: domainVersion,
  permissions: permissionsVersion,
};

export {
  ensureProfileForCurrentUser,
  loadVerifiedAuthUser,
  type EnsureProfileForUserResult,
} from './profile/ensure-profile-for-user.js';
export {
  getOwnProfile,
  updateOwnProfile,
  updateOwnProfileFields,
  type GetOwnProfileResult,
  type UpdateOwnProfileResult,
} from './profile/get-own-profile.js';
export { createFamily, type CreateFamilyResult } from './family/create-family.js';
export { updateFamily, type UpdateFamilyResult } from './family/update-family.js';
export { listMyFamilies, type ListMyFamiliesResult } from './family/list-my-families.js';
export { listFamilyMembers, type ListFamilyMembersResult } from './family/list-family-members.js';
export {
  setFamilyMemberRole,
  type SetFamilyMemberRoleResult,
} from './family/set-family-member-role.js';
export {
  setFamilyMemberStatus,
  type SetFamilyMemberStatusResult,
} from './family/set-family-member-status.js';
export {
  transferFamilyOwnership,
  type TransferFamilyOwnershipResult,
} from './family/transfer-family-ownership.js';
export {
  resolveAccessibleFamily,
  type ResolveAccessibleFamilyResult,
} from './family/resolve-accessible-family.js';
export {
  resolveDefaultFamilyId,
  type ResolveDefaultFamilyIdResult,
} from './family/resolve-default-family-id.js';
export {
  setActiveFamilyPreference,
  type SetActiveFamilyPreferenceResult,
} from './family/set-active-family-preference.js';
export { acceptInvitation, type AcceptInvitationResult } from './invitations/accept-invitation.js';
export { buildInvitationEmail } from './invitations/build-invitation-email.js';
export { canAssignInviteRole, canManageInvitations } from './invitations/can-invite.js';
export {
  createInvitation,
  type CreateInvitationContext,
  type CreateInvitationResult,
  type InvitationEmailRenderInput,
} from './invitations/create-invitation.js';
export type {
  InvitationEmailContent,
  InvitationEmailPayload,
  InvitationEmailSender,
} from './invitations/email-sender.js';
export {
  listFamilyInvitations,
  type ListFamilyInvitationsResult,
} from './invitations/list-family-invitations.js';
export { resolveInvitationEmailSender } from './invitations/resolve-email-sender.js';
export {
  parseInvitationSmtpConfigFromEnv,
  type InvitationSmtpConfig,
  type InvitationSmtpConfigErrorCode,
} from './invitations/invitation-smtp-config.js';
export { revokeInvitation, type RevokeInvitationResult } from './invitations/revoke-invitation.js';
export {
  createRecipeUploadSlot,
  type CreateRecipeUploadSlotUseCaseResult,
} from './recipe-asset/create-recipe-upload-slot.js';
export {
  finalizeRecipeUpload,
  type FinalizeRecipeUploadUseCaseResult,
} from './recipe-asset/finalize-recipe-upload.js';
export {
  createRecipeAssetDownloadUrl,
  type CreateRecipeAssetDownloadUrlResult,
} from './recipe-asset/create-recipe-asset-download-url.js';
export { archiveRecipe, type ArchiveRecipeResult } from './recipe/archive-recipe.js';
export { createRecipe, type CreateRecipeResult } from './recipe/create-recipe.js';
export { getRecipe, type GetRecipeResult } from './recipe/get-recipe.js';
export {
  upsertRecipeTranslations,
  type UpsertRecipeTranslationsResult,
} from './recipe/upsert-recipe-translations.js';
export { getRecipeHistory, type GetRecipeHistoryResult } from './recipe/get-recipe-history.js';
export { getRecipeAuditLog, type GetRecipeAuditLogResult } from './recipe/get-recipe-audit-log.js';
export { restoreRecipe, type RestoreRecipeResult } from './recipe/restore-recipe.js';
export { searchRecipes, type SearchRecipesResult } from './recipe/search-recipes.js';
export { updateRecipe, type UpdateRecipeResult } from './recipe/update-recipe.js';
