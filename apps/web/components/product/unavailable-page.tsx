import { getTranslations } from 'next-intl/server';

import { TextLink } from '@/components/product/text-link';
import type { AppLocale } from '@/i18n/routing';

export type UnavailableReason = 'notFound' | 'noAccess' | 'suspended';

export async function UnavailablePage({
  locale,
  headingLevel = 'h1',
  embedded = false,
  reason = 'notFound',
}: Readonly<{
  locale: AppLocale;
  headingLevel?: 'h1' | 'h2';
  embedded?: boolean;
  reason?: UnavailableReason;
}>) {
  const tNotFound = await getTranslations({ locale, namespace: 'notFound' });
  const tUnavailable = await getTranslations({ locale, namespace: 'unavailable' });
  const Heading = headingLevel;
  const Root = embedded ? 'section' : 'main';

  const copy =
    reason === 'suspended'
      ? {
          title: tUnavailable('suspended.title'),
          description: tUnavailable('suspended.description'),
        }
      : reason === 'noAccess'
        ? {
            title: tUnavailable('noAccess.title'),
            description: tUnavailable('noAccess.description'),
          }
        : { title: tNotFound('title'), description: tNotFound('description') };

  return (
    <Root
      className={
        embedded
          ? 'flex min-h-[40vh] flex-col justify-center gap-4 py-8'
          : 'mx-auto flex min-h-[40vh] max-w-3xl flex-col justify-center gap-4 px-6 py-16'
      }
    >
      <Heading className="font-serif-display text-3xl font-semibold tracking-tight text-foreground">
        {copy.title}
      </Heading>
      <p className="text-muted-foreground">{copy.description}</p>
      <p className="flex flex-wrap gap-x-6">
        {reason === 'notFound' ? (
          <TextLink href="/">{tNotFound('home')}</TextLink>
        ) : (
          <TextLink href="/families">{tUnavailable('families')}</TextLink>
        )}
      </p>
    </Root>
  );
}
