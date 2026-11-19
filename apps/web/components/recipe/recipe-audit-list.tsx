import type { AuditEventSummary } from '@family-cookbook/contracts';
import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';

type ActivityLogProps = Readonly<{
  heading: string;
  hint: string;
  /** Open on first render, e.g. when the reader is paging through the log. */
  defaultOpen: boolean;
  children: ReactNode;
}>;

/** Collapsed "Activity log" section under the history timeline (owner/admin only). */
export function RecipeActivityLog({ heading, hint, defaultOpen, children }: ActivityLogProps) {
  return (
    <details
      open={defaultOpen}
      className="group rounded-xl border border-border bg-card shadow-sm"
      aria-labelledby="audit-heading"
    >
      {/* A summary may hold phrasing and heading content only, so no wrapper element: a grid
          puts the heading and hint in one column and the chevron beside them. */}
      <summary className="grid min-h-11 cursor-pointer list-none grid-cols-[1fr_auto] items-center gap-x-3 rounded-xl px-4 py-3 marker:content-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-5 [&::-webkit-details-marker]:hidden">
        <h2
          id="audit-heading"
          className="col-start-1 font-serif-display text-lg font-semibold text-foreground"
        >
          {heading}
        </h2>
        <span className="col-start-1 block text-sm text-muted-foreground">{hint}</span>
        <ChevronDown
          aria-hidden
          className="col-start-2 row-span-2 row-start-1 size-5 shrink-0 text-muted-foreground group-open:rotate-180 motion-safe:transition-transform"
        />
      </summary>
      <div className="space-y-4 border-t border-border px-4 py-4 sm:px-5">{children}</div>
    </details>
  );
}

type Props = Readonly<{
  items: AuditEventSummary[];
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
      <div className="space-y-1">
        <p className="font-medium text-foreground">{emptyTitle}</p>
        <p className="text-sm text-muted-foreground">{emptyDescription}</p>
      </div>
    );
  }

  return (
    <ol className="divide-y divide-border">
      {items.map((item) => {
        const actorLabel =
          sessionUserId !== null && item.actorUserId === sessionUserId ? actorYou : actorMember;
        return (
          <li key={item.id} className="space-y-1 py-3 first:pt-0 last:pb-0">
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
  );
}
