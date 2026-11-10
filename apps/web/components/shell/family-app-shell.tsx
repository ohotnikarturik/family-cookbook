import type { FamilySummary } from '@family-cookbook/contracts';
import type { ReactNode } from 'react';

import { FlashToast } from '@/components/product/flash-toast';
import { SkipLink } from '@/components/product/skip-link';
import { FamilyShellHeader } from '@/components/shell/family-shell-header';
import { FamilyShellMain } from '@/components/shell/family-shell-main';
import { MobileNavigation } from '@/components/shell/mobile-navigation';

type Props = Readonly<{
  locale: string;
  familyId: string;
  familyName: string;
  families: readonly FamilySummary[];
  showAddRecipe: boolean;
  skipToContentLabel: string;
  children: ReactNode;
  contentClassName?: string;
}>;

export function FamilyAppShell({
  locale,
  familyId,
  familyName,
  families,
  showAddRecipe,
  skipToContentLabel,
  children,
  contentClassName,
}: Props) {
  return (
    <div className="mx-auto min-h-screen min-w-0 max-w-5xl px-6 py-4 pb-24 font-sans md:pb-8">
      <SkipLink href="#family-main">{skipToContentLabel}</SkipLink>
      <FamilyShellHeader
        locale={locale}
        familyId={familyId}
        familyName={familyName}
        families={families}
        showAddRecipe={showAddRecipe}
      />
      <FamilyShellMain
        familyId={familyId}
        {...(contentClassName ? { className: contentClassName } : {})}
      >
        {children}
      </FamilyShellMain>
      <FlashToast />
      <MobileNavigation familyId={familyId} showAddRecipe={showAddRecipe} />
    </div>
  );
}
