'use client';

import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { FamilySwitcher } from '@/components/family/family-switcher';
import { AccountMenu } from '@/components/shell/account-menu';
import { BrandLink } from '@/components/shell/brand-link';
import { PrimaryNavigation } from '@/components/shell/primary-navigation';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import type { FamilySummary } from '@family-cookbook/contracts';
import { cn } from '@/lib/utils';

type Props = Readonly<{
  locale: string;
  familyId: string;
  familyName: string;
  families: readonly FamilySummary[];
  showAddRecipe: boolean;
  className?: string;
}>;

export function FamilyShellHeader({
  locale,
  familyId,
  familyName,
  families,
  showAddRecipe,
  className,
}: Props) {
  const t = useTranslations('family.shell');
  const multiFamily = families.length > 1;

  return (
    <header
      className={cn(
        'sticky top-0 z-30 -mx-6 mb-6 border-b border-border bg-background/95 px-6 py-3 backdrop-blur-sm',
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
          <BrandLink href={`/f/${familyId}`} />
          {multiFamily ? (
            <FamilySwitcher
              families={families}
              currentFamilyId={familyId}
              selectId={`family-shell-switcher-${familyId}`}
            />
          ) : (
            <p className="min-w-0 max-w-[9rem] truncate text-sm font-medium text-muted-foreground sm:max-w-[12rem]">
              <span className="sr-only">{t('currentFamily')}</span>
              {familyName}
            </p>
          )}
          <PrimaryNavigation familyId={familyId} />
        </div>
        <div className="flex items-center gap-2">
          {showAddRecipe ? (
            <Button
              type="button"
              size="sm"
              className="hidden min-h-11 gap-1 md:inline-flex"
              asChild
            >
              <Link href={`/f/${familyId}/recipes/new`}>
                <Plus className="size-4" aria-hidden />
                {t('addRecipe')}
              </Link>
            </Button>
          ) : null}
          <AccountMenu locale={locale} />
        </div>
      </div>
    </header>
  );
}
