import { z } from 'zod';

export const PACKAGE_VERSION = '0.0.0';

/** Placeholder schema; replaced in T2.1 with recipe boundaries. */
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
