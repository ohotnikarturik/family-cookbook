import {
  familyRoleSchema,
  familyWorkspaceSchema,
  profilePreferredLanguageSchema,
  type FamilyWorkspace,
} from '@family-cookbook/contracts';
import { z } from 'zod';

import { getSessionUser } from '../auth/session.js';
import type { AppSupabaseClient } from '../supabase/server.js';

const membershipRowSchema = z.object({
  role: familyRoleSchema,
  families: z.object({
    id: z.uuid(),
    name: z.string(),
    default_language: profilePreferredLanguageSchema,
    deleted_at: z.string().nullable(),
  }),
});

export async function getFamilyWorkspaceForMember(
  client: AppSupabaseClient,
  familyId: string,
): Promise<
  | { ok: true; workspace: FamilyWorkspace }
  | { ok: false; error: 'forbidden' | 'query_failed' | 'invalid_row' }
> {
  const sessionUser = await getSessionUser(client);
  if (!sessionUser) {
    return { ok: false, error: 'forbidden' };
  }

  const { data: membership, error: membershipError } = await client
    .from('family_members')
    .select(
      `
      role,
      families!inner (
        id,
        name,
        default_language,
        deleted_at
      )
    `,
    )
    .eq('family_id', familyId)
    .eq('user_id', sessionUser.id)
    .eq('status', 'active')
    .maybeSingle();

  if (membershipError) {
    return { ok: false, error: 'query_failed' };
  }
  if (!membership) {
    return { ok: false, error: 'forbidden' };
  }

  const parsedMembership = membershipRowSchema.safeParse(membership);
  if (!parsedMembership.success || parsedMembership.data.families.deleted_at !== null) {
    return { ok: false, error: 'forbidden' };
  }

  const { count, error: countError } = await client
    .from('family_members')
    .select('id', { count: 'exact', head: true })
    .eq('family_id', familyId)
    .eq('status', 'active');

  if (countError) {
    return { ok: false, error: 'query_failed' };
  }

  const workspaceCandidate = {
    id: parsedMembership.data.families.id,
    name: parsedMembership.data.families.name,
    defaultLanguage: parsedMembership.data.families.default_language,
    role: parsedMembership.data.role,
    memberCount: count ?? 0,
  };

  const parsedWorkspace = familyWorkspaceSchema.safeParse(workspaceCandidate);
  if (!parsedWorkspace.success) {
    return { ok: false, error: 'invalid_row' };
  }

  return { ok: true, workspace: parsedWorkspace.data };
}
