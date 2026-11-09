import { describe, expect, it } from 'vitest';

import { updateProfileInputSchema } from './profile.js';

describe('updateProfileInputSchema', () => {
  it('accepts bounded profile fields', () => {
    const parsed = updateProfileInputSchema.safeParse({
      displayName: '  Martta  ',
      preferredLanguage: 'fi',
      themePreference: 'dark',
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.displayName).toBe('Martta');
    }
  });

  it('rejects empty or oversized display names', () => {
    expect(
      updateProfileInputSchema.safeParse({
        displayName: '',
        preferredLanguage: 'en',
        themePreference: 'system',
      }).success,
    ).toBe(false);
    expect(
      updateProfileInputSchema.safeParse({
        displayName: 'x'.repeat(81),
        preferredLanguage: 'en',
        themePreference: 'system',
      }).success,
    ).toBe(false);
  });

  it('rejects unsupported ui locale or theme', () => {
    expect(
      updateProfileInputSchema.safeParse({
        displayName: 'Cook',
        preferredLanguage: 'de',
        themePreference: 'system',
      }).success,
    ).toBe(false);
    expect(
      updateProfileInputSchema.safeParse({
        displayName: 'Cook',
        preferredLanguage: 'en',
        themePreference: 'high-contrast',
      }).success,
    ).toBe(false);
  });
});
