import { z } from 'zod';

import { familyIdSchema, familyRoleSchema } from './family.js';
import { membershipStatusSchema } from './family-member.js';

export const setFamilyMemberRoleInputSchema = z.object({
  familyId: familyIdSchema,
  memberUserId: z.uuid(),
  newRole: familyRoleSchema,
});

export type SetFamilyMemberRoleInput = z.infer<typeof setFamilyMemberRoleInputSchema>;

export const setFamilyMemberStatusInputSchema = z.object({
  familyId: familyIdSchema,
  memberUserId: z.uuid(),
  newStatus: membershipStatusSchema,
});

export type SetFamilyMemberStatusInput = z.infer<typeof setFamilyMemberStatusInputSchema>;
