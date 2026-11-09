import { describe, expect, it } from 'vitest';

import { createFamilyInputSchema, updateFamilyInputSchema } from './family.js';

const FAMILY_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

describe('updateFamilyInputSchema', () => {
  it('accepts bounded name and default recipe language', () => {
    const parsed = updateFamilyInputSchema.safeParse({
      familyId: FAMILY_ID,
      name: ' Andersen Test Kitchen ',
      defaultLanguage: 'fi',
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.name).toBe('Andersen Test Kitchen');
    }
  });

  it('rejects empty or oversized names', () => {
    expect(
      updateFamilyInputSchema.safeParse({
        familyId: FAMILY_ID,
        name: '',
        defaultLanguage: 'en',
      }).success,
    ).toBe(false);
    expect(
      updateFamilyInputSchema.safeParse({
        familyId: FAMILY_ID,
        name: 'x'.repeat(121),
        defaultLanguage: 'en',
      }).success,
    ).toBe(false);
  });

  it('rejects unsupported default languages', () => {
    expect(
      updateFamilyInputSchema.safeParse({
        familyId: FAMILY_ID,
        name: 'Kitchen',
        defaultLanguage: 'de',
      }).success,
    ).toBe(false);
  });
});

describe('createFamilyInputSchema', () => {
  it('keeps default language optional on create', () => {
    expect(createFamilyInputSchema.safeParse({ name: 'New family' }).success).toBe(true);
  });
});
