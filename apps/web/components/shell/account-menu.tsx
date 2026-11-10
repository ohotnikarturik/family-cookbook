'use client';

import { ChevronDown, UserRound } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { signOutAction } from '@/app/actions/auth';
import { LanguageSwitcher } from '@/components/i18n/language-switcher';
import { ThemeSwitcher } from '@/components/theme/ThemeSwitcher';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Link } from '@/i18n/navigation';

type Props = Readonly<{
  locale: string;
}>;

export function AccountMenu({ locale }: Props) {
  const t = useTranslations('family.shell');
  const tAccount = useTranslations('account');
  const tPrefs = useTranslations('uiPreferences');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-11 gap-1.5"
          aria-label={t('accountMenuLabel')}
        >
          <UserRound className="size-4" aria-hidden />
          <span className="hidden sm:inline">{t('account')}</span>
          <ChevronDown className="size-4 opacity-70" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 p-3">
        <DropdownMenuLabel>{tAccount('title')}</DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link href="/account" className="w-full cursor-pointer">
            {tAccount('signedInAs')}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/families" className="w-full cursor-pointer">
            {t('allFamilies')}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/account/preferences" className="w-full cursor-pointer">
            {tAccount('preferencesLink')}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <div className="space-y-3 px-1 py-2" role="group" aria-label={tPrefs('legend')}>
          <LanguageSwitcher className="max-w-none" variant="compact" />
          <ThemeSwitcher className="max-w-none" variant="compact" />
        </div>
        <DropdownMenuSeparator />
        <form action={signOutAction}>
          <input type="hidden" name="returnTo" value={`/${locale}/auth/sign-in`} />
          <Button type="submit" variant="outline" className="w-full min-h-11">
            {tAccount('signOut')}
          </Button>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
