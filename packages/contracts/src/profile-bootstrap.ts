import { z } from 'zod';

export const profilePreferredLanguageSchema = z.enum(['en', 'fi', 'ru', 'uk']);
export const profileThemePreferenceSchema = z.enum(['system', 'light', 'dark']);

export const profileBootstrapHintsSchema = z.object({
  preferredLanguage: profilePreferredLanguageSchema.optional(),
  themePreference: profileThemePreferenceSchema.optional(),
});

export type ProfileBootstrapHints = z.infer<typeof profileBootstrapHintsSchema>;
