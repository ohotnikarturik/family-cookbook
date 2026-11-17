'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { FlashToast } from '@/components/product/flash-toast';
import { SkipLink } from '@/components/product/skip-link';
import { AccountMenu } from '@/components/shell/account-menu';
import { BrandLink } from '@/components/shell/brand-link';

type Props = Readonly<{
  locale: string;
  /** Where the logo goes, as returned by `resolveSignedInLandingPath` (`/{locale}/...`). */
  homeHref: string;
  children: ReactNode;
}>;

/** Locale-less form of a `/{locale}/...` path, for the locale-aware `Link`. */
function withoutLocale(path: string, locale: string): string {
  const prefix = `/${locale}`;
  if (path === prefix) return '/';
  return path.startsWith(`${prefix}/`) ? path.slice(prefix.length) : path;
}

/**
 * Shell for signed-in pages outside a family (account, family list): the same sticky header as the
 * family shell, one content column, top-aligned.
 */
export function AccountShell({ locale, homeHref, children }: Props) {
  const t = useTranslations('family.shell');

  return (
    <div className="mx-auto min-h-screen min-w-0 max-w-3xl px-6 py-4 pb-12 font-sans">
      <SkipLink href="#account-main">{t('skipToContent')}</SkipLink>
      <header className="sticky top-0 z-30 -mx-6 mb-6 border-b border-border bg-background/95 px-6 py-3 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3">
          <BrandLink href={withoutLocale(homeHref, locale)} />
          <AccountMenu locale={locale} />
        </div>
      </header>
      <main id="account-main" className="min-w-0 space-y-8">
        {children}
      </main>
      <FlashToast />
    </div>
  );
}
