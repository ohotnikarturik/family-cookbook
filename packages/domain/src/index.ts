export const PACKAGE_VERSION = '0.0.0';

export {
  RECIPE_STATUSES,
  TRANSLATION_REVIEW_STATUSES,
  type RecipeStatus,
  type TranslationReviewStatus,
} from './recipe-status.js';
export type {
  FamilyId,
  FamilyTag,
  Recipe,
  RecipeAggregate,
  RecipeId,
  RecipeIngredient,
  RecipeIngredientTranslation,
  RecipeStep,
  RecipeStepTranslation,
  RecipeTranslation,
  UserId,
} from './recipe-types.js';
export { isRecipeVersionConflict, recipeVersionMatches } from './recipe-version.js';
export {
  ALLOWED_UPLOAD_MIME_TYPES,
  detectFileSignature,
  UPLOAD_IMAGE_MAX_BYTES,
  UPLOAD_PDF_MAX_BYTES,
  validateUploadedBytes,
  type AllowedUploadMimeType,
  type ValidateUploadedBytesInput,
  type ValidateUploadedBytesResult,
} from './file-signature.js';
export { safeRecipeAssetDownloadFilename } from './safe-download-filename.js';
export { resolveMemberDisplayLabel } from './member-display-name.js';
export {
  resolveRecipeDisplay,
  type RecipeDisplayIngredient,
  type RecipeDisplayStep,
  type RecipeForDisplay,
  type ResolvedRecipeDisplay,
} from './resolve-recipe-display.js';
