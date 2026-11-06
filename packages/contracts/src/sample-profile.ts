import { z } from 'zod';

/** Bounded demo field for T0.4 localized validation proof (not recipe domain yet). */
export const sampleDisplayNameSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
});

export type SampleDisplayNameInput = z.infer<typeof sampleDisplayNameSchema>;
