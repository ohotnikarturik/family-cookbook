'use client';

import type { ReactNode } from 'react';

import { usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

type Props = Readonly<{
  familyId: string;
  className?: string;
  children: ReactNode;
}>;

export function FamilyShellMain({ familyId, className, children }: Props) {
  const pathname = usePathname();
  const browse = pathname === `/f/${familyId}/recipes`;

  return (
    <div id="family-main" className={cn(browse ? 'w-full' : 'mx-auto w-full max-w-3xl', className)}>
      {children}
    </div>
  );
}
