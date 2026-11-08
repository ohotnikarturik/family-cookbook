import type { AuditEventSummary } from '@family-cookbook/contracts';

type Props = Readonly<{
  items: AuditEventSummary[];
  heading: string;
  emptyTitle: string;
  emptyDescription: string;
  eventLabel: (eventType: string) => string;
  versionLabel: (version: number) => string;
  actorYou: string;
  actorMember: string;
  formatDate: (iso: string) => string;
  sessionUserId: string | null;
}>;

export function RecipeAuditList({
  items,
  heading,
  emptyTitle,
  emptyDescription,
  eventLabel,
  versionLabel,
  actorYou,
  actorMember,
  formatDate,
  sessionUserId,
}: Props) {
  if (items.length === 0) {
    return (
      <section
        className="space-y-2 rounded-xl border border-border bg-card p-5 shadow-sm"
        aria-labelledby="audit-heading"
      >
        <h3 id="audit-heading" className="font-serif-display text-xl font-semibold text-foreground">
          {heading}
        </h3>
        <p className="font-medium text-foreground">{emptyTitle}</p>
        <p className="text-sm text-muted-foreground">{emptyDescription}</p>
      </section>
    );
  }

  return (
    <section aria-labelledby="audit-heading" className="space-y-3">
      <h3 id="audit-heading" className="font-serif-display text-xl font-semibold text-foreground">
        {heading}
      </h3>
      <ol className="divide-y divide-border rounded-xl border border-border bg-card shadow-sm">
        {items.map((item) => {
          const actorLabel =
            sessionUserId !== null && item.actorUserId === sessionUserId ? actorYou : actorMember;
          return (
            <li key={item.id} className="space-y-2 px-4 py-4 sm:px-5">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                <p className="font-medium text-foreground">{eventLabel(item.eventType)}</p>
                <time className="text-sm text-muted-foreground" dateTime={item.createdAt}>
                  {formatDate(item.createdAt)}
                </time>
              </div>
              <p className="text-sm text-muted-foreground">
                {actorLabel}
                {' · '}
                {versionLabel(item.metadata.version)}
              </p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
