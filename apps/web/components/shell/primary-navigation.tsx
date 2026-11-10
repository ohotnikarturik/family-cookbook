'use client';

import { BookOpen, Home } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link, usePathname } from '@/i18n/navigation';
import { familyNavSectionFromPathname } from '@/lib/family-shell-nav';
import { cn } from '@/lib/utils';

type Props = Readonly<{
  familyId: string;
  className?: string;
}>;

const items: {
  id: 'recipes' | 'family';
  href: (familyId: string) => string;
  icon: typeof BookOpen;
}[] = [
  { id: 'recipes', href: (id) => `/f/${id}/recipes`, icon: BookOpen },
  { id: 'family', href: (id) => `/f/${id}/settings`, icon: Home },
];

export function PrimaryNavigation({ familyId, className }: Props) {
  const t = useTranslations('family.shell');
  const pathname = usePathname();
  const active = familyNavSectionFromPathname(pathname, familyId);

  const labels = {
    recipes: t('recipes'),
    family: t('settings'),
  } as const;

  return (
    <nav
      aria-label={t('navLabel')}
      className={cn(
        'hidden items-center gap-1 rounded-xl border border-border bg-card p-1 shadow-sm md:flex',
        className,
      )}
    >
      {items.map((item) => {
        const isActive = active === item.id;
        const Icon = item.icon;
        return (
          <Link
            key={item.id}
            href={item.href(familyId)}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'inline-flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-[var(--transition-normal)]',
              'focus-visible:outline-none focus-visible:ring-[length:var(--ring-width)] focus-visible:ring-ring focus-visible:ring-offset-[length:var(--ring-offset)] focus-visible:ring-offset-background',
              isActive ? 'bg-primary/12 text-foreground' : 'text-foreground hover:bg-muted',
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            <span>{labels[item.id]}</span>
          </Link>
        );
      })}
    </nav>
  );
}
