import { getTranslations } from 'next-intl/server';
import { defaultLocale } from '@/i18n/routing';

export default async function NotFound() {
  const t = await getTranslations({ locale: defaultLocale, namespace: 'notFound' });

  return (
    <main className="mx-auto flex min-h-[50vh] max-w-3xl flex-col justify-center gap-4 px-6 py-16">
      <h1 className="font-serif-display text-3xl font-semibold tracking-tight text-foreground">
        {t('title')}
      </h1>
      <p className="text-muted-foreground">{t('description')}</p>
      <p>
        <a
          href={`/${defaultLocale}`}
          className="inline-flex min-h-11 items-center font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {t('home')}
        </a>
      </p>
    </main>
  );
}
