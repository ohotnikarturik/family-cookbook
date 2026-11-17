import { BookOpen, Home, Users, type LucideIcon } from 'lucide-react';

import type { FamilyNavSection } from '@/lib/family-shell-nav';

export type FamilyNavItem = Readonly<{
  id: Exclude<FamilyNavSection, 'other'>;
  href: (familyId: string) => string;
  icon: LucideIcon;
}>;

/** The three primary sections, shared by the desktop and mobile navigation. */
export const FAMILY_NAV_ITEMS: readonly FamilyNavItem[] = [
  { id: 'home', href: (id) => `/f/${id}`, icon: Home },
  { id: 'recipes', href: (id) => `/f/${id}/recipes`, icon: BookOpen },
  { id: 'family', href: (id) => `/f/${id}/settings`, icon: Users },
];
