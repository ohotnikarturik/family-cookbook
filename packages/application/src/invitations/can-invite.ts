import type { FamilyRole } from '@family-cookbook/contracts';

export function canManageInvitations(role: FamilyRole): boolean {
  return role === 'owner' || role === 'admin';
}

export function canAssignInviteRole(inviterRole: FamilyRole, targetRole: FamilyRole): boolean {
  if (targetRole === 'owner') {
    return false;
  }
  if (targetRole === 'admin') {
    return inviterRole === 'owner';
  }
  if (inviterRole === 'admin') {
    return true;
  }
  return inviterRole === 'owner';
}
