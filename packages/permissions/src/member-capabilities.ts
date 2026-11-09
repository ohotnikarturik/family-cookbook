import type { FamilyRole, MembershipStatus } from '@family-cookbook/contracts';

export function canManageFamilyMembers(role: FamilyRole): boolean {
  return role === 'owner' || role === 'admin';
}

export function canChangeFamilySettings(role: FamilyRole): boolean {
  return canManageFamilyMembers(role);
}

export function canAssignMemberRole(actorRole: FamilyRole, targetRole: FamilyRole): boolean {
  if (targetRole === 'owner') {
    return false;
  }
  if (targetRole === 'admin') {
    return actorRole === 'owner';
  }
  if (actorRole === 'admin') {
    return true;
  }
  return actorRole === 'owner';
}

export function canAdministrateTargetMember(
  actorRole: FamilyRole,
  actorUserId: string,
  target: Readonly<{ userId: string; role: FamilyRole; status: MembershipStatus }>,
): boolean {
  if (!canManageFamilyMembers(actorRole)) {
    return false;
  }
  if (target.userId === actorUserId) {
    return false;
  }
  if (target.role === 'owner') {
    return false;
  }
  if (target.role === 'admin' && actorRole !== 'owner') {
    return false;
  }
  return true;
}

export function assignableMemberRolesForActor(actorRole: FamilyRole): FamilyRole[] {
  const candidates: FamilyRole[] = ['viewer', 'contributor', 'editor', 'admin'];
  return candidates.filter((role) => canAssignMemberRole(actorRole, role));
}

export function canTransferFamilyOwnership(actorRole: FamilyRole): boolean {
  return actorRole === 'owner';
}

export function canReceiveFamilyOwnership(
  actorUserId: string,
  target: Readonly<{ userId: string; role: FamilyRole; status: MembershipStatus }>,
): boolean {
  if (target.userId === actorUserId) {
    return false;
  }
  if (target.role === 'owner') {
    return false;
  }
  if (target.status !== 'active') {
    return false;
  }
  return true;
}
