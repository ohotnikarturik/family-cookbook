import { listFamilyMembersInputSchema, type FamilyMemberDirectoryEntry } from '@family-cookbook/contracts';
import { getFamilyWorkspaceForMember, listFamilyMemberDirectory } from '@family-cookbook/data-access';
import type { AppSupabaseClient } from '@family-cookbook/data-access';

import { loadVerifiedAuthUser } from '../profile/ensure-profile-for-user.js';

export type ListFamilyMembersResult =
  | { status: 'auth_required' }
  | { status: 'validation_error' }
  | { status: 'forbidden' }
  | { status: 'query_failed' }
  | { status: 'ok'; members: FamilyMemberDirectoryEntry[] };

export async function listFamilyMembers(
  client: AppSupabaseClient,
  rawInput: unknown,
): Promise<ListFamilyMembersResult> {
  const auth = await loadVerifiedAuthUser(client);
  if (auth.status !== 'ok') {
    return { status: 'auth_required' };
  }

  const parsed = listFamilyMembersInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { status: 'validation_error' };
  }

  const workspace = await getFamilyWorkspaceForMember(client, parsed.data.familyId);
  if (!workspace.ok) {
    return { status: 'forbidden' };
  }

  const listed = await listFamilyMemberDirectory(client, parsed.data.familyId);
  if (!listed.ok) {
    return listed.error === 'forbidden' ? { status: 'forbidden' } : { status: 'query_failed' };
  }

  return { status: 'ok', members: listed.members };
}
