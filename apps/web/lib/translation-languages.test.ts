import { describe, expect, it } from 'vitest';

import { availableTranslationLanguages } from '@/lib/translation-languages';

describe('availableTranslationLanguages', () => {
  it('leaves out the source language and existing translations', () => {
    expect(
      availableTranslationLanguages({
        sourceLanguage: 'en',
        translations: [{ languageTag: 'fi' }, { languageTag: 'uk' }],
      }),
    ).toEqual(['ru']);
  });

  it('compares tags without case', () => {
    expect(
      availableTranslationLanguages({
        sourceLanguage: 'FI',
        translations: [{ languageTag: 'RU' }],
      }),
    ).toEqual(['en', 'uk']);
  });

  it('returns nothing when every language is used', () => {
    expect(
      availableTranslationLanguages({
        sourceLanguage: 'en',
        translations: [{ languageTag: 'fi' }, { languageTag: 'ru' }, { languageTag: 'uk' }],
      }),
    ).toEqual([]);
  });
});
