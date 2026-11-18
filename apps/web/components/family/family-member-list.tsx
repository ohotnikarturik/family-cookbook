import { FamilyMemberChangeDialog } from '@/components/family/family-member-change-dialog';
import type { MemberRow } from '@/lib/member-rows';

type Props = Readonly<{
  familyId: string;
  members: readonly MemberRow[];
  emptyLabel: string;
  /** "Admin · Active": role and status as plain text. */
  summaryFor: (member: MemberRow) => string;
}>;

/**
 * The one member list: name, role and status per row. Rows the server marked `manageable`
 * get a "Change" dialog; everyone else sees the same list without it.
 */
export function FamilyMemberList({ familyId, members, emptyLabel, summaryFor }: Props) {
  if (members.length === 0) {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        {emptyLabel}
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border rounded-xl border border-border bg-card">
      {members.map((member) => (
        <li
          key={member.userId}
          className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3"
        >
          <div className="min-w-0 space-y-1">
            <p className="text-base font-medium break-words text-foreground">{member.label}</p>
            <p className="text-sm text-muted-foreground">{summaryFor(member)}</p>
          </div>
          {member.manageable ? (
            <FamilyMemberChangeDialog
              familyId={familyId}
              member={{
                userId: member.userId,
                label: member.label,
                role: member.role,
                status: member.status,
                roleOptions: member.roleOptions,
              }}
            />
          ) : null}
        </li>
      ))}
    </ul>
  );
}
