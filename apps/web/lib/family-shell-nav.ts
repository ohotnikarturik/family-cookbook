/** Match family workspace routes for shell navigation active states. */

export type FamilyNavSection = 'recipes' | 'family' | 'dashboard' | 'other';

export function familyNavSectionFromPathname(pathname: string, familyId: string): FamilyNavSection {
  const prefix = `/f/${familyId}`;
  if (!pathname.startsWith(prefix)) {
    return 'dashboard';
  }
  const rest = pathname.slice(prefix.length);
  if (rest === '' || rest === '/') {
    return 'dashboard';
  }
  if (rest.startsWith('/recipes')) {
    return 'recipes';
  }
  if (rest.startsWith('/settings')) {
    return 'family';
  }
  return 'other';
}

export function familySettingsSubnavFromPathname(
  pathname: string,
  familyId: string,
): 'general' | 'members' | 'invitations' | null {
  const base = `/f/${familyId}/settings`;
  if (pathname === base || pathname === `${base}/`) {
    return 'general';
  }
  if (pathname.startsWith(`${base}/members`)) {
    return 'members';
  }
  if (pathname.startsWith(`${base}/invitations`)) {
    return 'invitations';
  }
  return null;
}
