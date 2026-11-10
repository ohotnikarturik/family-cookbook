'use client';

import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { usePathname } from '@/i18n/navigation';
import { FLASH_NOTICE_COOKIE, RECIPE_SAVED_NOTICE } from '@/lib/flash-notice';

function readAndClearNotice(): string | null {
  const prefix = `${FLASH_NOTICE_COOKIE}=`;
  const match = document.cookie.split('; ').find((part) => part.startsWith(prefix));
  if (!match) {
    return null;
  }
  const value = decodeURIComponent(match.slice(prefix.length));
  document.cookie = `${FLASH_NOTICE_COOKIE}=; Max-Age=0; path=/`;
  return value;
}

export function FlashToast() {
  const t = useTranslations('notices');
  const pathname = usePathname();
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const code = readAndClearNotice();
    if (code !== RECIPE_SAVED_NOTICE) {
      return;
    }
    const frame = window.setTimeout(() => setMessage(t('recipeSaved')), 0);
    return () => window.clearTimeout(frame);
  }, [pathname, t]);

  useEffect(() => {
    if (!message) {
      return;
    }
    const timer = window.setTimeout(() => setMessage(null), 8000);
    return () => window.clearTimeout(timer);
  }, [message]);

  if (!message) {
    return null;
  }

  return (
    <div
      role="status"
      className="fixed inset-x-4 z-50 flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground shadow-md bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] md:inset-x-auto md:right-6 md:bottom-6 md:w-full md:max-w-sm"
    >
      <p>{message}</p>
      <button
        type="button"
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => setMessage(null)}
        aria-label={t('dismiss')}
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}
