import { z } from 'zod';

import { authEmailSchema } from './auth-email.js';
import { familyIdSchema, familyRoleSchema } from './family.js';

export const INVITATION_EXPIRY_DAYS = 7;
export const INVITATION_TOKEN_MIN_LENGTH = 16;
export const INVITATION_TOKEN_MAX_LENGTH = 256;

export const invitableFamilyRoleSchema = familyRoleSchema.exclude(['owner']);

export const invitationTokenSchema = z
  .string()
  .trim()
  .min(INVITATION_TOKEN_MIN_LENGTH)
  .max(INVITATION_TOKEN_MAX_LENGTH);

export function isPendingInvitationExpired(expiresAtIso: string, now: Date): boolean {
  const expiresAt = Date.parse(expiresAtIso);
  if (Number.isNaN(expiresAt)) {
    return false;
  }
  return expiresAt <= now.getTime();
}

export const inviteMemberInputSchema = z.object({
  familyId: familyIdSchema,
  email: authEmailSchema,
  role: invitableFamilyRoleSchema,
});

export type InviteMemberInput = z.infer<typeof inviteMemberInputSchema>;

export const pendingInvitationSchema = z.object({
  id: z.uuid(),
  familyId: familyIdSchema,
  email: authEmailSchema,
  role: invitableFamilyRoleSchema,
  expiresAt: z.string(),
  createdAt: z.string(),
  expired: z.boolean(),
});

export type PendingInvitation = z.infer<typeof pendingInvitationSchema>;
