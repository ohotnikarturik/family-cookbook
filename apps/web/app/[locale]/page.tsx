import { applicationBootstrapMarker } from '@family-cookbook/application';
import { PACKAGE_VERSION as contractsVersion } from '@family-cookbook/contracts';
import { getFormatter, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { SampleDisplayNameForm } from '@/components/home/sample-display-name-form';
import { LanguageSwitcher } from '@/components/i18n/language-switcher';
import { Link } from '@/i18n/navigation';
import { type AppLocale, locales } from '@/i18n/routing';

type Props = Readonly<{ params: Promise<{ locale: string }> }>;

export default function HomePage(props: Props) {
  return (
    <Suspense fallback={<HomeFallback />}>
      <HomeContent params={props.params} />
    </Suspense>
  );
}

function HomeFallback() {
  return (
    <main
      aria-busy="true"
      className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-8 px-6 py-16"
    >
      <div className="h-9 w-48 animate-pulse rounded-md bg-muted" />
      <div className="h-24 animate-pulse rounded-xl bg-muted" />
      <div className="h-36 animate-pulse rounded-xl bg-muted" />
    </main>
  );
}

async function HomeContent(props: Props) {
  const { locale: localeParam } = await props.params;
  if (!(locales as readonly string[]).includes(localeParam)) {
    notFound();
  }
  const locale = localeParam as AppLocale;

  const t = await getTranslations({ locale, namespace: 'home' });
  const format = await getFormatter({ locale });
  const showDesignLink = process.env['NODE_ENV'] !== 'production';

  const refDate = new Date('2026-03-15T14:30:00.000Z');
  const demoCount = 3;

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-8 px-6 py-16 font-sans">
      <div className="space-y-4">
        <h1 className="font-serif-display text-3xl font-semibold tracking-tight text-foreground">
          {t('title')}
        </h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
        <LanguageSwitcher />
      </div>

      <section
        aria-labelledby="format-demo-heading"
        className="space-y-2 rounded-xl border border-border bg-muted/30 p-5 text-sm text-foreground"
      >
        <h2 id="format-demo-heading" className="text-base font-semibold">
          {t('formatDemo.title')}
        </h2>
        <dl className="space-y-2">
          <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between">
            <dt className="text-muted-foreground">{t('formatDemo.numberLabel')}</dt>
            <dd className="font-mono">{format.number(12345.67, { minimumFractionDigits: 2 })}</dd>
          </div>
          <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between">
            <dt className="text-muted-foreground">{t('formatDemo.dateLabel')}</dt>
            <dd className="font-mono">
              {format.dateTime(refDate, { dateStyle: 'medium', timeStyle: 'short' })}
            </dd>
          </div>
          <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between">
            <dt className="text-muted-foreground">{t('formatDemo.pluralLabel')}</dt>
            <dd>{t('formatDemo.recipeCount', { count: demoCount })}</dd>
          </div>
        </dl>
      </section>

      <SampleDisplayNameForm />

      <dl className="rounded-xl border border-border bg-card p-5 text-sm text-card-foreground shadow-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">{t('contractsLabel')}</dt>
          <dd className="font-mono text-foreground">{contractsVersion}</dd>
        </div>
        <div className="mt-3 flex justify-between gap-4">
          <dt className="text-muted-foreground">{t('applicationLayersLabel')}</dt>
          <dd className="max-w-[55%] break-all text-right font-mono text-foreground">
            {JSON.stringify(applicationBootstrapMarker)}
          </dd>
        </div>
      </dl>
      {showDesignLink ? (
        <footer className="border-t border-border pt-4">
          <Link
            href="/design"
            className="text-sm font-medium text-primary underline-offset-4 transition-colors hover:text-primary/90 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {t('designGalleryLink')}
          </Link>
        </footer>
      ) : null}
    </main>
  );
}
