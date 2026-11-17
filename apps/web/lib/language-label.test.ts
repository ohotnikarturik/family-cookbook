import { describe, expect, it } from 'vitest';

import { languageLabel } from '@/lib/language-label';

const expected: Record<string, Record<string, string>> = {
  en: { en: 'English', fi: 'Finnish', ru: 'Russian', uk: 'Ukrainian' },
  fi: { en: 'Englanti', fi: 'Suomi', ru: 'Venäjä', uk: 'Ukraina' },
  ru: { en: 'Английский', fi: 'Финский', ru: 'Русский', uk: 'Украинский' },
  uk: { en: 'Англійська', fi: 'Фінська', ru: 'Російська', uk: 'Українська' },
};

describe('languageLabel', () => {
  for (const [uiLocale, names] of Object.entries(expected)) {
    for (const [tag, name] of Object.entries(names)) {
      it(`names ${tag} in ${uiLocale}`, () => {
        expect(languageLabel(tag, uiLocale)).toBe(name);
      });
    }
  }

  it('handles regional tags', () => {
    expect(languageLabel('fi-FI', 'en')).toBe('Finnish (Finland)');
  });

  it('normalises case and whitespace', () => {
    expect(languageLabel('  FI ', 'en')).toBe('Finnish');
  });

  it('falls back to the raw tag for unknown or malformed tags', () => {
    expect(languageLabel('zz', 'en')).toBe('zz');
    expect(languageLabel('xx-invalid!', 'en')).toBe('xx-invalid!');
  });

  it('falls back to the raw tag for an unsupported UI locale', () => {
    expect(languageLabel('fi', 'not a locale!')).toBe('fi');
  });
});
