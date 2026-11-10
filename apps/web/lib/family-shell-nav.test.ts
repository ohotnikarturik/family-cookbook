import { describe, expect, it } from 'vitest';

import {
  familyNavSectionFromPathname,
  familySettingsSubnavFromPathname,
} from '@/lib/family-shell-nav';

const familyId = '00000000-0000-4000-8000-0000000000aa';

describe('familyNavSectionFromPathname', () => {
  it('keeps the dashboard distinct from the recipe list', () => {
    expect(familyNavSectionFromPathname(`/f/${familyId}`, familyId)).toBe('dashboard');
    expect(familyNavSectionFromPathname(`/f/${familyId}/`, familyId)).toBe('dashboard');
    expect(familyNavSectionFromPathname(`/f/${familyId}/recipes`, familyId)).toBe('recipes');
    expect(familyNavSectionFromPathname(`/f/${familyId}/recipes/new`, familyId)).toBe('recipes');
  });

  it('treats settings routes as the family section', () => {
    expect(familyNavSectionFromPathname(`/f/${familyId}/settings`, familyId)).toBe('family');
    expect(familyNavSectionFromPathname(`/f/${familyId}/settings/members`, familyId)).toBe(
      'family',
    );
    expect(familySettingsSubnavFromPathname(`/f/${familyId}/settings/invitations`, familyId)).toBe(
      'invitations',
    );
  });

  it('does not mark an unknown family route as recipes', () => {
    expect(familyNavSectionFromPathname(`/f/${familyId}/unknown`, familyId)).toBe('other');
    expect(familyNavSectionFromPathname('/account', familyId)).toBe('dashboard');
  });
});
