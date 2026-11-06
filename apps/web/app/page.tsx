import { applicationBootstrapMarker } from '@family-cookbook/application';
import { PACKAGE_VERSION as contractsVersion } from '@family-cookbook/contracts';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

export default async function Home() {
  const t = await getTranslations('home');
  const showDesignLink = process.env['NODE_ENV'] !== 'production';

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-6 py-16 font-sans">
      <div>
        <h1 className="font-serif-display text-3xl font-semibold tracking-tight text-foreground">
          {t('title')}
        </h1>
        <p className="mt-3 text-muted-foreground">{t('subtitle')}</p>
      </div>
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
