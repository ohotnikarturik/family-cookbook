import { PACKAGE_VERSION as domainVersion } from '@family-cookbook/domain';

export const PACKAGE_VERSION = '0.0.0';

export const permissionsBootstrapMarker = domainVersion;

export {
  assignableMemberRolesForActor,
  canAdministrateTargetMember,
  canAssignMemberRole,
  canManageFamilyMembers,
  canChangeFamilySettings,
  canReceiveFamilyOwnership,
  canTransferFamilyOwnership,
} from './member-capabilities.js';
export {
  canArchiveRecipe,
  canAttachRecipeAsset,
  canCreateRecipe,
  canEditRecipe,
  canManageRecipeTags,
  canRestoreRecipe,
  canViewAuditEvents,
  canViewRecipeAsset,
  canViewRecipeHistory,
  canViewRecipes,
} from './recipe-capabilities.js';
