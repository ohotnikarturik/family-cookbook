import { z } from 'zod';

import { familyIdSchema } from './family.js';

const AUDIT_EVENT_TYPE_MAX = 120;
const AUDIT_ENTITY_TYPE_MAX = 120;

/** Shallow metadata written by recipe aggregate RPCs (no recipe body). */
export const auditEventMetadataSchema = z.object({
  recipeId: z.uuid(),
  version: z.number().int().min(1),
});

export type AuditEventMetadata = z.infer<typeof auditEventMetadataSchema>;

export const auditEventSummarySchema = z.object({
  id: z.uuid(),
  familyId: familyIdSchema,
  actorUserId: z.uuid().nullable(),
  eventType: z.string().min(1).max(AUDIT_EVENT_TYPE_MAX),
  entityType: z.string().min(1).max(AUDIT_ENTITY_TYPE_MAX),
  entityId: z.uuid().nullable(),
  metadata: auditEventMetadataSchema,
  createdAt: z.string(),
});

export type AuditEventSummary = z.infer<typeof auditEventSummarySchema>;

export const recipeAuditResultSchema = z.object({
  items: z.array(auditEventSummarySchema),
  nextCursor: z.string().nullable(),
});

export type RecipeAuditResult = z.infer<typeof recipeAuditResultSchema>;
