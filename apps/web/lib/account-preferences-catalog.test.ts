import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { locales, type AppLocale } from '@/i18n/routing';

const messagesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../messages');

type JsonObject = Record<string, unknown>;

function leafPaths(value: unknown, prefix = ''): string[] {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return prefix ? [prefix] : [];
  }
  return Object.entries(value as JsonObject).flatMap(([key, nested]) =>
    leafPaths(nested, prefix ? `${prefix}.${key}` : key),
  );
}

function readCatalog(locale: AppLocale): JsonObject {
  return JSON.parse(readFileSync(path.join(messagesDir, `${locale}.json`), 'utf8')) as JsonObject;
}

describe('account.preferences message catalogs', () => {
  it('defines the same keys in every UI locale', () => {
    const reference = readCatalog('en');
    const account = reference['account'] as JsonObject | undefined;
    const preferences = account?.['preferences'] as JsonObject | undefined;
    expect(preferences).toBeDefined();

    const required = leafPaths(preferences).sort();

    for (const locale of locales) {
      if (locale === 'en') continue;
      const catalog = readCatalog(locale);
      const block = (catalog['account'] as JsonObject | undefined)?.['preferences'] as
        | JsonObject
        | undefined;
      expect(block, `${locale} missing account.preferences`).toBeDefined();
      const present = new Set(leafPaths(block));
      for (const key of required) {
        expect(present.has(key), `${locale} missing account.preferences.${key}`).toBe(true);
      }
    }
  });
});
