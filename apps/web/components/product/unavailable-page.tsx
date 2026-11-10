import { getTranslations } from 'next-intl/server';

import { TextLink } from '@/components/product/text-link';
import type { AppLocale } from '@/i18n/routing';

export async function UnavailablePage({
  locale,
  headingLevel = 'h1',
  embedded = false,
}: Readonly<{ locale: AppLocale; headingLevel?: 'h1' | 'h2'; embedded?: boolean }>) {
  const t = await getTranslations({ locale, namespace: 'notFound' });
  const Heading = headingLevel;
  const Root = embedded ? 'section' : 'main';

  return (
    <Root
      className={
        embedded
          ? 'flex min-h-[40vh] flex-col justify-center gap-4 py-8'
          : 'mx-auto flex min-h-[40vh] max-w-3xl flex-col justify-center gap-4 px-6 py-16'
      }
    >
      <Heading className="font-serif-display text-3xl font-semibold tracking-tight text-foreground">
        {t('title')}
      </Heading>
      <p className="text-muted-foreground">{t('description')}</p>
      <p>
        <TextLink href="/">{t('home')}</TextLink>
      </p>
    </Root>
  );
}
