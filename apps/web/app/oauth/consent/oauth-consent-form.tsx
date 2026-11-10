'use client';

import { createBrowserSupabaseClient } from '@family-cookbook/data-access/supabase/browser';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

import { Button } from '@/components/ui/button';

type Props = {
  authorizationId: string;
  clientName: string;
  scopes: string[];
};

export function OAuthConsentForm({ authorizationId, clientName, scopes }: Props) {
  const t = useTranslations('oauthConsent');
  const router = useRouter();
  const [pending, setPending] = useState<'approve' | 'deny' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (action: 'approve' | 'deny') => {
      setPending(action);
      setError(null);
      const supabase = createBrowserSupabaseClient();
      try {
        if (action === 'approve') {
          const { data, error: approveError } =
            await supabase.auth.oauth.approveAuthorization(authorizationId);
          if (approveError) {
            setError(t('errorAction'));
            return;
          }
          const redirectUrl =
            data && typeof data === 'object' && 'redirect_url' in data
              ? String((data as { redirect_url: string }).redirect_url)
              : null;
          if (redirectUrl) {
            router.replace(redirectUrl);
            return;
          }
        } else {
          const { data, error: denyError } =
            await supabase.auth.oauth.denyAuthorization(authorizationId);
          if (denyError) {
            setError(t('errorAction'));
            return;
          }
          const redirectUrl =
            data && typeof data === 'object' && 'redirect_url' in data
              ? String((data as { redirect_url: string }).redirect_url)
              : null;
          if (redirectUrl) {
            router.replace(redirectUrl);
            return;
          }
        }
        setError(t('errorAction'));
      } finally {
        setPending(null);
      }
    },
    [authorizationId, router, t],
  );

  return (
    <div className="flex flex-col gap-6">
      <header className="space-y-2">
        <h1 className="font-serif text-2xl text-foreground">{t('title')}</h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
        <p className="text-lg font-medium text-foreground">{clientName || t('clientUnknown')}</p>
      </header>
      {scopes.length > 0 ? (
        <section>
          <h2 className="mb-2 text-sm font-medium text-foreground">{t('scopesHeading')}</h2>
          <ul className="list-inside list-disc text-sm text-muted-foreground">
            {scopes.map((scope) => (
              <li key={scope}>{scope}</li>
            ))}
          </ul>
        </section>
      ) : null}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          disabled={pending !== null}
          onClick={() => void run('approve')}
          className="min-h-11 min-w-11"
        >
          {pending === 'approve' ? t('working') : t('approve')}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending !== null}
          onClick={() => void run('deny')}
          className="min-h-11 min-w-11"
        >
          {pending === 'deny' ? t('working') : t('deny')}
        </Button>
      </div>
    </div>
  );
}
