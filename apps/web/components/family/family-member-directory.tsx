'use client';

import type { FamilyRole, MembershipStatus } from '@family-cookbook/contracts';
import { useActionState, useId } from 'react';

import {
  setFamilyMemberRoleAction,
  setFamilyMemberStatusAction,
  type FamilyMemberAdminActionState,
} from '@/app/actions/family-member-admin';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

type ManagedMember = Readonly<{
  userId: string;
  label: string;
  role: FamilyRole;
  status: MembershipStatus;
}>;

type RoleLabels = Readonly<Record<FamilyRole, string>>;

type AdminLabels = Readonly<{
  roleField: string;
  saveRole: string;
  savingRole: string;
  suspend: string;
  suspending: string;
  reactivate: string;
  reactivating: string;
  manageMember: string;
  roleLabels: RoleLabels;
}>;

type Props = Readonly<{
  familyId: string;
  members: readonly ManagedMember[];
  assignableRoles: readonly FamilyRole[];
  adminLabels: AdminLabels;
  sectionTitle: string;
}>;

export function FamilyMemberAdminSection({
  familyId,
  members,
  assignableRoles,
  adminLabels,
  sectionTitle,
}: Props) {
  const headingId = useId();

  if (members.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4" aria-labelledby={headingId}>
      <h3 id={headingId} className="text-base font-semibold text-foreground">
        {sectionTitle}
      </h3>
      <ul className="list-none space-y-2 p-0">
        {members.map((member) => (
          <MemberAdminPanel
            key={member.userId}
            familyId={familyId}
            member={member}
            assignableRoles={assignableRoles}
            adminLabels={adminLabels}
          />
        ))}
      </ul>
    </section>
  );
}

function MemberAdminPanel({
  familyId,
  member,
  assignableRoles,
  adminLabels,
}: Readonly<{
  familyId: string;
  member: ManagedMember;
  assignableRoles: readonly FamilyRole[];
  adminLabels: AdminLabels;
}>) {
  const [roleState, roleAction, rolePending] = useActionState<
    FamilyMemberAdminActionState | null,
    FormData
  >(setFamilyMemberRoleAction, null);
  const [statusState, statusAction, statusPending] = useActionState<
    FamilyMemberAdminActionState | null,
    FormData
  >(setFamilyMemberStatusAction, null);
  const headingId = useId();
  const roleFieldId = useId();

  const error =
    roleState?.ok === false
      ? roleState.message
      : statusState?.ok === false
        ? statusState.message
        : null;
  const roleOptions = assignableRoles.includes(member.role)
    ? assignableRoles
    : [...assignableRoles, member.role];
  const roleLocked = member.status !== 'active';

  return (
    <li className="rounded-lg border border-border bg-card">
      <div className="flex min-h-11 flex-wrap items-center justify-between gap-2 px-4 py-2">
        <h4 id={headingId} className="text-sm font-semibold text-foreground">
          {member.label}
        </h4>
        <p className="text-sm text-muted-foreground">{adminLabels.roleLabels[member.role]}</p>
      </div>
      {error ? (
        <p className="px-4 pb-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <details className="border-t border-border">
        <summary className="min-h-11 cursor-pointer list-none px-4 py-3 text-sm font-medium text-foreground marker:content-none [&::-webkit-details-marker]:hidden">
          {adminLabels.manageMember}
        </summary>
        <div className="space-y-3 border-t border-border p-4">
          <form action={roleAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <input type="hidden" name="familyId" value={familyId} />
            <input type="hidden" name="memberUserId" value={member.userId} />
            <div className="min-w-0 flex-1 space-y-2">
              <Label htmlFor={roleFieldId}>{adminLabels.roleField}</Label>
              <select
                id={roleFieldId}
                name="newRole"
                defaultValue={member.role}
                disabled={rolePending || roleLocked}
                className="flex min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {roleOptions.map((role) => (
                  <option key={role} value={role}>
                    {adminLabels.roleLabels[role]}
                  </option>
                ))}
              </select>
            </div>
            <Button
              type="submit"
              variant="secondary"
              className="min-h-11 w-full sm:w-auto"
              disabled={rolePending || roleLocked}
            >
              {rolePending ? adminLabels.savingRole : adminLabels.saveRole}
            </Button>
          </form>
          <form action={statusAction}>
            <input type="hidden" name="familyId" value={familyId} />
            <input type="hidden" name="memberUserId" value={member.userId} />
            <input
              type="hidden"
              name="newStatus"
              value={member.status === 'active' ? 'suspended' : 'active'}
            />
            <Button
              type="submit"
              variant={member.status === 'active' ? 'outline' : 'default'}
              className="min-h-11 w-full sm:w-auto"
              disabled={statusPending}
            >
              {statusPending
                ? member.status === 'active'
                  ? adminLabels.suspending
                  : adminLabels.reactivating
                : member.status === 'active'
                  ? adminLabels.suspend
                  : adminLabels.reactivate}
            </Button>
          </form>
        </div>
      </details>
    </li>
  );
}
