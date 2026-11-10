'use client';

import { BookOpen, Home, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link, usePathname } from '@/i18n/navigation';
import { familyNavSectionFromPathname } from '@/lib/family-shell-nav';
import { cn } from '@/lib/utils';

type Props = Readonly<{
  familyId: string;
  showAddRecipe: boolean;
}>;

export function MobileNavigation({ familyId, showAddRecipe }: Props) {
  const t = useTranslations('family.shell');
  const pathname = usePathname();
  const active = familyNavSectionFromPathname(pathname, familyId);
  const recipesActive = active === 'recipes';
  const familyActive = active === 'family';

  return (
    <nav
      aria-label={t('mobileNavLabel')}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface-raised/95 pb-[max(env(safe-area-inset-bottom),0.25rem)] backdrop-blur-sm md:hidden"
    >
      <ul className="mx-auto grid max-w-lg list-none grid-cols-3 gap-1 p-2">
        <li>
          <Link
            href={`/f/${familyId}/recipes`}
            aria-current={recipesActive ? 'page' : undefined}
            className={cn(
              'flex min-h-11 min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-center text-xs font-medium leading-tight',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              recipesActive ? 'text-primary' : 'text-muted-foreground',
            )}
          >
            <BookOpen className="size-5 shrink-0" aria-hidden />
            <span className="max-w-full text-balance">{t('recipes')}</span>
          </Link>
        </li>
        <li>
          {showAddRecipe ? (
            <Link
              href={`/f/${familyId}/recipes/new`}
              className={cn(
                'flex min-h-11 min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg bg-primary px-1 text-center text-xs font-medium leading-tight text-primary-foreground shadow-sm',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              )}
            >
              <Plus className="size-5 shrink-0" aria-hidden />
              <span className="max-w-full text-balance">{t('addRecipe')}</span>
            </Link>
          ) : (
            <span
              className="flex min-h-11 min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-center text-xs leading-tight text-muted-foreground opacity-50"
              aria-hidden
            >
              <Plus className="size-5 shrink-0" />
              <span className="max-w-full text-balance">{t('addRecipe')}</span>
            </span>
          )}
        </li>
        <li>
          <Link
            href={`/f/${familyId}/settings`}
            aria-current={familyActive ? 'page' : undefined}
            className={cn(
              'flex min-h-11 min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-center text-xs font-medium leading-tight',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              familyActive ? 'text-primary' : 'text-muted-foreground',
            )}
          >
            <Home className="size-5 shrink-0" aria-hidden />
            <span className="max-w-full text-balance">{t('settings')}</span>
          </Link>
        </li>
      </ul>
    </nav>
  );
}
