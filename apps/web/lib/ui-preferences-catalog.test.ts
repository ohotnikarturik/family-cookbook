import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { locales } from '@/i18n/routing';
import { parseThemePreference, THEME_COOKIE } from '@/lib/theme';

const messagesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../messages');

describe('ui preferences catalogs', () => {
  it('defines uiPreferences in every UI locale', () => {
    for (const locale of locales) {
      const raw = readFileSync(path.join(messagesDir, `${locale}.json`), 'utf8');
      const json = JSON.parse(raw) as { uiPreferences?: { legend: string; hint: string } };
      expect(json.uiPreferences?.legend).toBeTypeOf('string');
      expect(json.uiPreferences?.hint).toBeTypeOf('string');
    }
  });

  it('accepts every theme preference value used in the switcher', () => {
    for (const value of ['system', 'light', 'dark'] as const) {
      expect(parseThemePreference(value)).toBe(value);
    }
    expect(THEME_COOKIE).toBe('fc-theme');
  });
});
