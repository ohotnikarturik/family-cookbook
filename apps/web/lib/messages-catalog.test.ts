import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { locales } from '@/i18n/routing';

const messagesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../messages');

type Catalog = { [key: string]: string | Catalog };

function load(locale: string): Catalog {
  return JSON.parse(readFileSync(path.join(messagesDir, `${locale}.json`), 'utf8')) as Catalog;
}

/** Flattens a catalog to `a.b.c` keys with their string values. */
function flatten(catalog: Catalog, prefix = ''): Map<string, unknown> {
  const entries = new Map<string, unknown>();
  for (const [key, value] of Object.entries(catalog)) {
    const name = `${prefix}${key}`;
    if (typeof value === 'object' && value !== null) {
      for (const [child, childValue] of flatten(value, `${name}.`)) {
        entries.set(child, childValue);
      }
    } else {
      entries.set(name, value);
    }
  }
  return entries;
}

describe('message catalogs', () => {
  const reference = flatten(load('en'));

  it.each(locales.filter((locale) => locale !== 'en'))('%s has exactly the en keys', (locale) => {
    const keys = [...flatten(load(locale)).keys()];
    const missing = [...reference.keys()].filter((key) => !keys.includes(key));
    const extra = keys.filter((key) => !reference.has(key));
    expect({ missing, extra }).toEqual({ missing: [], extra: [] });
  });

  it.each(locales)('%s has no empty or non-string messages', (locale) => {
    const bad = [...flatten(load(locale))]
      .filter(([, value]) => typeof value !== 'string' || value.trim().length === 0)
      .map(([key]) => key);
    expect(bad).toEqual([]);
  });

  // W38.18: engineering words a non-technical relative would not understand.
  const bannedTerms: Record<string, RegExp> = {
    en: /workspace|tenant|\bcontext\b|\btoken\b|isolated|\bsessions?\b|\blocale\b|invitee|revoke/i,
    fi: /työtila|konteks|istunto|tenant/i,
    ru: /пространств|изолирован|контекст|сеанс|арендатор/i,
    uk: /простір|простор|ізольов|контекст|сесі[яює]|орендар/i,
  };

  it.each(locales)('%s copy has no engineering jargon', (locale) => {
    const found = [...flatten(load(locale))]
      // The design gallery is a developer page and may use design vocabulary.
      .filter(([key]) => !key.startsWith('design.'))
      .filter(([, value]) => typeof value === 'string' && bannedTerms[locale]!.test(value))
      .map(([key, value]) => `${key}: ${String(value)}`);
    expect(found).toEqual([]);
  });

  it('defines the contextual tip copy in every locale', () => {
    for (const locale of locales) {
      const messages = flatten(load(locale));
      for (const key of [
        'common.whatIsThis',
        'recipes.editor.hints.sourceLanguageMore',
        'recipes.lifecycle.archiveVsDeleteSummary',
        'recipes.lifecycle.archiveVsDelete',
        'invitations.form.rolesSummary',
      ]) {
        expect(messages.get(key), `${locale}: ${key}`).toBeTypeOf('string');
      }
    }
  });
});
