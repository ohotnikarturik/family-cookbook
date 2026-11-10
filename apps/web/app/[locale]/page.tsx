import { getSessionUser } from '@family-cookbook/data-access';
import { createServerSupabaseClient } from '@family-cookbook/data-access/supabase/server';
import { getTranslations } from 'next-intl/server';
import { connection } from 'next/server';
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';

import { resolveSignedInLandingPath } from '@/lib/post-auth-path';

import { HomeAuthLinks } from '@/components/home/home-auth-links';
import { CompactUiPreferences } from '@/components/preferences/compact-ui-preferences';
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
  await connection();
  const { locale: localeParam } = await props.params;
  if (!(locales as readonly string[]).includes(localeParam)) {
    notFound();
  }
  const locale = localeParam as AppLocale;

  const supabase = await createServerSupabaseClient();
  const sessionUser = await getSessionUser(supabase);
  if (sessionUser) {
    redirect(await resolveSignedInLandingPath(supabase, locale));
  }

  const t = await getTranslations({ locale, namespace: 'home' });
  const showDesignLink = process.env['NODE_ENV'] !== 'production';

  const bullets = [t('bulletCollect'), t('bulletTogether'), t('bulletLanguages')];

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-10 px-6 py-16 font-sans">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-4">
          <h1 className="font-serif-display text-3xl font-semibold tracking-tight text-foreground">
            {t('title')}
          </h1>
          <p className="text-base leading-relaxed text-muted-foreground">{t('subtitle')}</p>
        </div>
        <CompactUiPreferences className="shrink-0 sm:max-w-xs" />
      </div>

      <ul className="list-none space-y-3 p-0 text-sm leading-relaxed text-foreground">
        {bullets.map((line) => (
          <li key={line} className="flex gap-3">
            <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-hidden />
            <span>{line}</span>
          </li>
        ))}
      </ul>

      <div className="space-y-4">
        <Suspense fallback={null}>
          <HomeAuthLinks locale={locale} />
        </Suspense>
        <p className="text-sm text-muted-foreground">{t('inviteHint')}</p>
      </div>

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
