'use client';

import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { FAMILY_NAV_ITEMS, type FamilyNavItem } from '@/components/shell/family-nav-items';
import { Link, usePathname } from '@/i18n/navigation';
import { familyNavSectionFromPathname } from '@/lib/family-shell-nav';
import { cn } from '@/lib/utils';

type Props = Readonly<{
  familyId: string;
  showAddRecipe: boolean;
}>;

const itemClass = cn(
  'relative flex min-h-11 min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg px-1 pt-1 text-center text-xs leading-tight',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
);

export function MobileNavigation({ familyId, showAddRecipe }: Props) {
  const t = useTranslations('family.shell');
  const pathname = usePathname();
  const active = familyNavSectionFromPathname(pathname, familyId);

  const labels = { home: t('home'), recipes: t('recipes'), family: t('family') } as const;
  const [home, recipes, family] = FAMILY_NAV_ITEMS as readonly [
    FamilyNavItem,
    FamilyNavItem,
    FamilyNavItem,
  ];

  function renderSection(item: FamilyNavItem) {
    const isActive = active === item.id;
    const Icon = item.icon;
    return (
      <li key={item.id}>
        <Link
          href={item.href(familyId)}
          aria-current={isActive ? 'page' : undefined}
          className={cn(
            itemClass,
            isActive ? 'font-bold text-primary' : 'font-medium text-muted-foreground',
          )}
        >
          {isActive ? (
            <span className="absolute inset-x-3 -top-2 h-1 rounded-full bg-primary" aria-hidden />
          ) : null}
          <Icon className="size-5 shrink-0" aria-hidden />
          <span className="max-w-full text-balance">{labels[item.id]}</span>
        </Link>
      </li>
    );
  }

  return (
    <nav
      aria-label={t('mobileNavLabel')}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface-raised/95 pb-[max(env(safe-area-inset-bottom),0.25rem)] backdrop-blur-sm md:hidden"
    >
      <ul className="mx-auto grid max-w-lg list-none auto-cols-fr grid-flow-col gap-1 p-2 pt-3">
        {renderSection(home)}
        {renderSection(recipes)}
        {showAddRecipe ? (
          <li>
            <Link
              href={`/f/${familyId}/recipes/new`}
              className={cn(itemClass, 'font-medium text-foreground')}
            >
              <span
                className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground"
                aria-hidden
              >
                <Plus className="size-4" />
              </span>
              <span className="max-w-full text-balance">{t('addRecipe')}</span>
            </Link>
          </li>
        ) : null}
        {renderSection(family)}
      </ul>
    </nav>
  );
}
