import { z } from 'zod';

import { profilePreferredLanguageSchema } from './profile-bootstrap.js';

export const familyIdSchema = z.uuid();

export const familyRoleSchema = z.enum(['owner', 'admin', 'editor', 'contributor', 'viewer']);

export const createFamilyInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  defaultLanguage: profilePreferredLanguageSchema.optional(),
});

export type CreateFamilyInput = z.infer<typeof createFamilyInputSchema>;

export const familySummarySchema = z.object({
  id: familyIdSchema,
  name: z.string(),
  defaultLanguage: profilePreferredLanguageSchema,
  role: familyRoleSchema,
});

export type FamilySummary = z.infer<typeof familySummarySchema>;

export const familyWorkspaceSchema = familySummarySchema.extend({
  memberCount: z.number().int().nonnegative(),
});

export type FamilyWorkspace = z.infer<typeof familyWorkspaceSchema>;
