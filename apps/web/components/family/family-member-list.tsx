type MemberRow = Readonly<{
  userId: string;
  label: string;
  roleLabel: string;
  suspended: boolean;
}>;

type Props = Readonly<{
  members: readonly MemberRow[];
  emptyLabel: string;
  suspendedLabel: string;
}>;

export function FamilyMemberList({ members, emptyLabel, suspendedLabel }: Props) {
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
          className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="space-y-1">
            <p className="text-base font-medium text-foreground">{member.label}</p>
            {member.suspended ? (
              <p className="text-xs text-muted-foreground">{suspendedLabel}</p>
            ) : null}
          </div>
          <span className="inline-flex min-h-11 w-fit items-center rounded-full border border-border bg-surface-raised px-3 text-sm font-medium text-foreground">
            {member.roleLabel}
          </span>
        </li>
      ))}
    </ul>
  );
}
