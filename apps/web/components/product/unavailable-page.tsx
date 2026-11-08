import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/navigation';
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
        <Link
          href="/"
          className="inline-flex min-h-11 items-center font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {t('home')}
        </Link>
      </p>
    </Root>
  );
}
