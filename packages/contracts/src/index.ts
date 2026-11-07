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
