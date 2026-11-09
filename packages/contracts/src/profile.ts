import { z } from 'zod';

import {
  profilePreferredLanguageSchema,
  profileThemePreferenceSchema,
} from './profile-bootstrap.js';

export const PROFILE_DISPLAY_NAME_MAX = 80;

export const profileDisplayNameSchema = z.string().trim().min(1).max(PROFILE_DISPLAY_NAME_MAX);

export const updateProfileInputSchema = z.object({
  displayName: profileDisplayNameSchema,
  preferredLanguage: profilePreferredLanguageSchema,
  themePreference: profileThemePreferenceSchema,
});

export type UpdateProfileInput = z.infer<typeof updateProfileInputSchema>;

export const ownProfileSchema = z.object({
  displayName: profileDisplayNameSchema,
  preferredLanguage: profilePreferredLanguageSchema,
  themePreference: profileThemePreferenceSchema,
});

export type OwnProfile = z.infer<typeof ownProfileSchema>;
