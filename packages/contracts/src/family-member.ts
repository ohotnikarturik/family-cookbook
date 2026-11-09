import { z } from 'zod';

import { familyIdSchema, familyRoleSchema } from './family.js';

export const FAMILY_MEMBER_DISPLAY_NAME_MAX = 80;

export const membershipStatusSchema = z.enum(['active', 'suspended']);

export type MembershipStatus = z.infer<typeof membershipStatusSchema>;

export const familyMemberDirectoryEntrySchema = z.object({
  userId: z.uuid(),
  role: familyRoleSchema,
  status: membershipStatusSchema,
  displayName: z.string().trim().min(1).max(FAMILY_MEMBER_DISPLAY_NAME_MAX).nullable(),
});

export type FamilyMemberDirectoryEntry = z.infer<typeof familyMemberDirectoryEntrySchema>;

export const listFamilyMembersInputSchema = z.object({
  familyId: familyIdSchema,
});

export type ListFamilyMembersInput = z.infer<typeof listFamilyMembersInputSchema>;
