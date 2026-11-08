import { z } from 'zod';

export const PACKAGE_VERSION = '0.0.0';

/** MCP health check payload (apps/mcp). */
export const bootstrapHealthSchema = z.object({
  status: z.literal('ok'),
});

export type BootstrapHealth = z.infer<typeof bootstrapHealthSchema>;

export {
  authEmailOtpSchema,
  authEmailSchema,
  EMAIL_OTP_LENGTH,
  type AuthEmail,
  type AuthEmailOtp,
} from './auth-email.js';
export {
  profileBootstrapHintsSchema,
  profilePreferredLanguageSchema,
  profileThemePreferenceSchema,
  type ProfileBootstrapHints,
} from './profile-bootstrap.js';
export { sampleDisplayNameSchema, type SampleDisplayNameInput } from './sample-profile.js';
export {
  createFamilyInputSchema,
  familyIdSchema,
  familyRoleSchema,
  familySummarySchema,
  familyWorkspaceSchema,
  type CreateFamilyInput,
  type FamilyRole,
  type FamilySummary,
  type FamilyWorkspace,
} from './family.js';
export {
  INVITATION_EXPIRY_DAYS,
  INVITATION_TOKEN_MAX_LENGTH,
  INVITATION_TOKEN_MIN_LENGTH,
  isPendingInvitationExpired,
  invitationTokenSchema,
  inviteMemberInputSchema,
  invitableFamilyRoleSchema,
  pendingInvitationSchema,
  type InviteMemberInput,
  type PendingInvitation,
} from './invitation.js';
export {
  MAX_RECIPE_INGREDIENT_TRANSLATIONS,
  MAX_RECIPE_INGREDIENTS,
  MAX_RECIPE_STEP_TRANSLATIONS,
  MAX_RECIPE_STEPS,
  MAX_RECIPE_TRANSLATIONS,
  MAX_TAGS_PER_RECIPE,
  RECIPE_HISTORY_LIMIT_MAX,
  RECIPE_MINUTES_MAX,
  RECIPE_SERVINGS_MAX,
  RECIPE_TITLE_MAX,
  SEARCH_RECIPES_LIMIT_MAX,
} from './recipe-limits.js';
export { recipeLanguageTagSchema, type RecipeLanguageTag } from './recipe-language.js';
export {
  recipeIngredientInputSchema,
  recipeIngredientsInputSchema,
  type RecipeIngredientInput,
} from './recipe-ingredient.js';
export {
  recipeStepInputSchema,
  recipeStepsInputSchema,
  type RecipeStepInput,
} from './recipe-step.js';
export {
  familyTagSummarySchema,
  recipeTagAttachSchema,
  recipeTagByIdSchema,
  recipeTagByNameSchema,
  recipeTagNameSchema,
  recipeTagsAttachInputSchema,
  type FamilyTagSummary,
  type RecipeTagAttach,
  type RecipeTagName,
} from './recipe-tag.js';
export {
  recipeIngredientTranslationInputSchema,
  recipeIngredientTranslationsInputSchema,
  recipeStepTranslationInputSchema,
  recipeStepTranslationsInputSchema,
  recipeTranslationInputSchema,
  recipeTranslationsInputSchema,
  translationReviewStatusSchema,
  type RecipeIngredientTranslationInput,
  type RecipeStepTranslationInput,
  type RecipeTranslationInput,
  type TranslationReviewStatus,
} from './recipe-translation.js';
export {
  recipeCoreFieldsSchema,
  recipeIdSchema,
  recipeStatusSchema,
  type RecipeCoreFields,
  type RecipeStatus,
} from './recipe-core.js';
export {
  createRecipeInputSchema,
  createRecipePayloadSchema,
  type CreateRecipeInput,
  type CreateRecipePayload,
} from './recipe-create.js';
export {
  updateRecipeInputSchema,
  updateRecipePayloadSchema,
  type UpdateRecipeInput,
  type UpdateRecipePayload,
} from './recipe-update.js';
export {
  recipeSearchSortSchema,
  searchRecipesInputSchema,
  type RecipeSearchSort,
  type SearchRecipesInput,
} from './recipe-search.js';
export {
  archiveRecipeInputSchema,
  getRecipeAuditInputSchema,
  getRecipeHistoryInputSchema,
  getRecipeInputSchema,
  restoreRecipeInputSchema,
  type ArchiveRecipeInput,
  type GetRecipeAuditInput,
  type GetRecipeHistoryInput,
  type GetRecipeInput,
  type RestoreRecipeInput,
} from './recipe-lifecycle.js';
export {
  assetKindSchema,
  assetStatusSchema,
  createRecipeUploadSlotInputSchema,
  createRecipeUploadSlotResultSchema,
  finalizeRecipeUploadInputSchema,
  finalizeRecipeUploadResultSchema,
  RECIPE_ASSET_ALLOWED_MIME_TYPES,
  RECIPE_ASSET_IMAGE_MAX_BYTES,
  RECIPE_ASSET_PDF_MAX_BYTES,
  RECIPE_ASSETS_PER_RECIPE_MAX,
  RECIPE_DOWNLOAD_SIGNED_URL_TTL_SECONDS,
  RECIPE_MEDIA_BUCKET_ID,
  RECIPE_UPLOAD_SIGNED_URL_TTL_SECONDS,
  recipeAssetDownloadDispositionSchema,
  recipeAssetDownloadInputSchema,
  recipeAssetDownloadResultSchema,
  recipeAssetIdSchema,
  recipeAssetMimeTypeSchema,
  recipeAssetSummarySchema,
  type AssetKind,
  type AssetStatus,
  type CreateRecipeUploadSlotInput,
  type CreateRecipeUploadSlotResult,
  type FinalizeRecipeUploadInput,
  type FinalizeRecipeUploadResult,
  type RecipeAssetDownloadDisposition,
  type RecipeAssetDownloadInput,
  type RecipeAssetDownloadResult,
  type RecipeAssetMimeType,
  type RecipeAssetSummary,
} from './recipe-asset.js';
export {
  auditEventMetadataSchema,
  auditEventSummarySchema,
  recipeAuditResultSchema,
  type AuditEventMetadata,
  type AuditEventSummary,
  type RecipeAuditResult,
} from './recipe-audit-read.js';
export {
  RECIPE_SEARCH_DEFAULT_LIMIT,
  RECIPE_SEARCH_MAX_LIMIT,
  recipeDetailSchema,
  recipeHistoryResultSchema,
  recipeMutationResultSchema,
  recipeRevisionSummarySchema,
  recipeSearchResultSchema,
  recipeSummarySchema,
  type RecipeDetail,
  type RecipeHistoryResult,
  type RecipeMutationResultRow,
  type RecipeRevisionSummary,
  type RecipeSearchResult,
  type RecipeSummary,
} from './recipe-read.js';
