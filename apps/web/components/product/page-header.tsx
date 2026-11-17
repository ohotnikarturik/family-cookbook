import type { ReactNode } from 'react';

import { TextLink } from '@/components/product/text-link';

type Props = Readonly<{
  title: string;
  /** BCP 47 tag when the title is user content in another language than the interface. */
  titleLang?: string;
  description?: ReactNode;
  /** Rendered above the title, so it is the first thing keyboard and screen-reader users meet. */
  back?: Readonly<{ href: string; label: string }>;
  /** Primary page actions; they wrap below the title on narrow screens. */
  actions?: ReactNode;
  id?: string;
}>;

/**
 * The one page header for signed-in pages: the page's only `<h1>`, an optional description,
 * an optional back link above the title, and an optional actions slot.
 */
export function PageHeader({ title, titleLang, description, back, actions, id }: Props) {
  return (
    <header className="space-y-2">
      {back ? <TextLink href={back.href}>{back.label}</TextLink> : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1
            id={id}
            lang={titleLang}
            className="font-serif-display text-2xl font-semibold tracking-tight text-foreground [overflow-wrap:anywhere] sm:text-3xl"
          >
            {title}
          </h1>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
    </header>
  );
}
