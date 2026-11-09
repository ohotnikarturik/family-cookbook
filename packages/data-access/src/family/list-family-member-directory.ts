import {
  FAMILY_MEMBER_DISPLAY_NAME_MAX,
  familyMemberDirectoryEntrySchema,
  familyRoleSchema,
  membershipStatusSchema,
  type FamilyMemberDirectoryEntry,
} from '@family-cookbook/contracts';
import { z } from 'zod';

import type { AppSupabaseClient } from '../supabase/server.js';

const rpcRowSchema = z.object({
  user_id: z.uuid(),
  role: familyRoleSchema,
  status: membershipStatusSchema,
  display_name: z.string().nullable(),
});

export async function listFamilyMemberDirectory(
  client: AppSupabaseClient,
  familyId: string,
): Promise<
  | { ok: true; members: FamilyMemberDirectoryEntry[] }
  | { ok: false; error: 'forbidden' | 'query_failed' | 'invalid_row' }
> {
  const { data, error } = await client.rpc('list_family_member_directory', {
    p_family_id: familyId,
  });

  if (error) {
    if (error.code === '42501') {
      return { ok: false, error: 'forbidden' };
    }
    return { ok: false, error: 'query_failed' };
  }

  const members: FamilyMemberDirectoryEntry[] = [];
  for (const row of data ?? []) {
    const parsedRow = rpcRowSchema.safeParse(row);
    if (!parsedRow.success) {
      return { ok: false, error: 'invalid_row' };
    }
    const entry = familyMemberDirectoryEntrySchema.safeParse({
      userId: parsedRow.data.user_id,
      role: parsedRow.data.role,
      status: parsedRow.data.status,
      displayName: boundDisplayName(parsedRow.data.display_name),
    });
    if (!entry.success) {
      return { ok: false, error: 'invalid_row' };
    }
    members.push(entry.data);
  }

  return { ok: true, members };
}

function boundDisplayName(value: string | null): string | null {
  if (value === null) {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }
  const characters = Array.from(trimmed);
  if (characters.length <= FAMILY_MEMBER_DISPLAY_NAME_MAX) {
    return trimmed;
  }
  return characters.slice(0, FAMILY_MEMBER_DISPLAY_NAME_MAX).join('');
}
