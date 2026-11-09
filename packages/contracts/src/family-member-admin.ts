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

export const formerOwnerRoleSchema = familyRoleSchema.exclude(['owner']);

export type FormerOwnerRole = z.infer<typeof formerOwnerRoleSchema>;

export const transferFamilyOwnershipInputSchema = z.object({
  familyId: familyIdSchema,
  newOwnerUserId: z.uuid(),
  confirm: z.literal(true),
  formerOwnerRole: formerOwnerRoleSchema.optional(),
});

export type TransferFamilyOwnershipInput = z.infer<typeof transferFamilyOwnershipInputSchema>;
