export function resolveMemberDisplayLabel(
  input: Readonly<{
    displayName: string | null;
    memberUserId: string;
    actorUserId: string;
    youLabel: string;
    neutralLabel: string;
  }>,
): string {
  if (input.memberUserId === input.actorUserId) {
    return input.youLabel;
  }
  const trimmed = input.displayName?.trim();
  if (trimmed && trimmed.length > 0) {
    return trimmed;
  }
  return input.neutralLabel;
}
