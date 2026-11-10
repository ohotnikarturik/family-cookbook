'use client';

import { useTranslations } from 'next-intl';

import { Link, usePathname } from '@/i18n/navigation';
import { familySettingsSubnavFromPathname } from '@/lib/family-shell-nav';
import { cn } from '@/lib/utils';

type Props = Readonly<{
  familyId: string;
  showInvitations: boolean;
}>;

export function FamilySettingsSubnav({ familyId, showInvitations }: Props) {
  const t = useTranslations('family.settings');
  const pathname = usePathname();
  const active = familySettingsSubnavFromPathname(pathname, familyId);

  const links = [
    { key: 'general' as const, href: `/f/${familyId}/settings`, label: t('subnavGeneral') },
    { key: 'members' as const, href: `/f/${familyId}/settings/members`, label: t('subnavMembers') },
    ...(showInvitations
      ? [
          {
            key: 'invitations' as const,
            href: `/f/${familyId}/settings/invitations`,
            label: t('subnavInvitations'),
          },
        ]
      : []),
  ];

  return (
    <nav
      aria-label={t('subnavLabel')}
      className="-mx-1 flex gap-2 overflow-x-auto pb-1 md:flex-wrap"
    >
      {links.map((link) => {
        const isActive = active === link.key;
        return (
          <Link
            key={link.key}
            href={link.href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'inline-flex min-h-11 shrink-0 items-center rounded-full border px-4 text-sm font-medium',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              isActive
                ? 'border-primary/40 bg-primary/12 text-foreground'
                : 'border-border bg-card text-primary hover:bg-muted',
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
