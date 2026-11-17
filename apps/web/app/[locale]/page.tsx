import { getSessionUser } from '@family-cookbook/data-access';
import { createServerSupabaseClient } from '@family-cookbook/data-access/supabase/server';
import { getTranslations } from 'next-intl/server';
import { connection } from 'next/server';
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';

import { resolveSignedInLandingPath } from '@/lib/post-auth-path';

import { HomeAuthLinks } from '@/components/home/home-auth-links';
import { TextLink } from '@/components/product/text-link';
import { LoadingState } from '@/components/product/loading-state';
import { AuthShell } from '@/components/shell/auth-shell';
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
    <AuthShell width="wide">
      <LoadingState />
    </AuthShell>
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
    <AuthShell width="wide">
      <div className="min-w-0 space-y-4">
        <h1 className="font-serif-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {t('title')}
        </h1>
        <p className="text-base leading-relaxed text-muted-foreground">{t('subtitle')}</p>
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
        <p>
          <TextLink href="/design">{t('designGalleryLink')}</TextLink>
        </p>
      ) : null}
    </AuthShell>
  );
}
