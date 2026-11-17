'use client';

import { ChefHat } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';

type Props = Readonly<{
  /** Locale-less path, for example `/f/{id}` or `/`. */
  href: string;
}>;

/** The logo and product name; the name is screen-reader-only below `sm` so the link keeps a name. */
export function BrandLink({ href }: Props) {
  const t = useTranslations('family.shell');

  return (
    <Link
      href={href}
      className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-1 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span
        className="flex size-9 items-center justify-center rounded-lg bg-primary/12 text-primary"
        aria-hidden
      >
        <ChefHat className="size-5" />
      </span>
      <span className="sr-only font-serif-display text-base font-semibold sm:not-sr-only">
        {t('productName')}
      </span>
    </Link>
  );
}
