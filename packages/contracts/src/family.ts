import { z } from 'zod';

import { profilePreferredLanguageSchema } from './profile-bootstrap.js';

export const familyIdSchema = z.uuid();

export const familyRoleSchema = z.enum(['owner', 'admin', 'editor', 'contributor', 'viewer']);

export type FamilyRole = z.infer<typeof familyRoleSchema>;

export const createFamilyInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  defaultLanguage: profilePreferredLanguageSchema.optional(),
});

export type CreateFamilyInput = z.infer<typeof createFamilyInputSchema>;

export const updateFamilyInputSchema = z.object({
  familyId: familyIdSchema,
  name: z.string().trim().min(1).max(120),
  defaultLanguage: profilePreferredLanguageSchema,
});

export type UpdateFamilyInput = z.infer<typeof updateFamilyInputSchema>;

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
