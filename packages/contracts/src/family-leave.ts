import { z } from 'zod';

import { familyIdSchema } from './family.js';

export const leaveFamilyInputSchema = z.object({
  familyId: familyIdSchema,
  confirm: z.literal(true),
});

export type LeaveFamilyInput = z.infer<typeof leaveFamilyInputSchema>;

/** Why the signed-in user cannot open a family they once belonged to. */
export const familyAccessStateSchema = z.enum(['suspended', 'left']);

export type FamilyAccessState = z.infer<typeof familyAccessStateSchema>;
