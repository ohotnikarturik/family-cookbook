import { canAssignInviteRole } from '@family-cookbook/application';
import type { FamilyRole } from '@family-cookbook/contracts';

const INVITE_ROLE_CANDIDATES: FamilyRole[] = ['viewer', 'contributor', 'editor', 'admin'];

export function invitableRolesForActor(actorRole: FamilyRole): FamilyRole[] {
  return INVITE_ROLE_CANDIDATES.filter((role) => canAssignInviteRole(actorRole, role));
}
