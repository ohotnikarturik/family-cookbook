import { PACKAGE_VERSION as domainVersion } from '@family-cookbook/domain';

export const PACKAGE_VERSION = '0.0.0';

export const permissionsBootstrapMarker = domainVersion;

export {
  canArchiveRecipe,
  canCreateRecipe,
  canEditRecipe,
  canManageRecipeTags,
  canRestoreRecipe,
  canViewRecipeHistory,
  canViewRecipes,
} from './recipe-capabilities.js';
