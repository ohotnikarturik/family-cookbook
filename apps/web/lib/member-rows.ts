import type { FamilyRole, MembershipStatus } from '@family-cookbook/contracts';
import {
  assignableMemberRolesForActor,
  canAdministrateTargetMember,
} from '@family-cookbook/permissions';

export type MemberRowInput = Readonly<{
  userId: string;
  label: string;
  role: FamilyRole;
  status: MembershipStatus;
}>;

export type MemberRow = MemberRowInput &
  Readonly<{
    /** Server-computed: the actor may open "Change" for this row. RLS still decides on save. */
    manageable: boolean;
    /** Roles offered in the change dialog; empty when the row is not manageable. */
    roleOptions: readonly FamilyRole[];
  }>;

/**
 * One row per member for the Members page. Runs on the server only; the client receives
 * the `manageable` flag and never decides it.
 */
export function buildMemberRows(
  members: readonly MemberRowInput[],
  actor: Readonly<{ role: FamilyRole; userId: string }>,
): MemberRow[] {
  const assignable = assignableMemberRolesForActor(actor.role);
  return members.map((member) => {
    const manageable = canAdministrateTargetMember(actor.role, actor.userId, member);
    const roleOptions: readonly FamilyRole[] = manageable
      ? assignable.includes(member.role)
        ? assignable
        : [...assignable, member.role]
      : [];
    return { ...member, manageable, roleOptions };
  });
}
