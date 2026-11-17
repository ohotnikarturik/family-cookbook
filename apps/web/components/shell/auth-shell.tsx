'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { AuthFooterPreferences } from '@/components/preferences/auth-footer-preferences';
import { SkipLink } from '@/components/product/skip-link';
import { BrandLink } from '@/components/shell/brand-link';
import { cn } from '@/lib/utils';

type Props = Readonly<{
  /** `narrow` for forms, `wide` for the public landing page. */
  width?: 'narrow' | 'wide';
  children: ReactNode;
}>;

/**
 * Shell for sign-in, onboarding, invitation and landing pages: logo, one content column, and the
 * language and appearance row at the bottom.
 */
export function AuthShell({ width = 'narrow', children }: Props) {
  const t = useTranslations('family.shell');

  return (
    <div
      className={cn(
        'mx-auto flex min-h-screen min-w-0 flex-col gap-8 px-6 py-4 pb-12 font-sans',
        width === 'wide' ? 'max-w-2xl' : 'max-w-lg',
      )}
    >
      <SkipLink href="#auth-main">{t('skipToContent')}</SkipLink>
      <header>
        <BrandLink href="/" />
      </header>
      <main id="auth-main" className="flex min-w-0 flex-1 flex-col gap-8">
        {children}
      </main>
      <AuthFooterPreferences />
    </div>
  );
}
