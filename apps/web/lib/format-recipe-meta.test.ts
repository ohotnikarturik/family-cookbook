import { describe, expect, it } from 'vitest';

import { createTranslator } from 'next-intl';

import { locales, type AppLocale } from '@/i18n/routing';
import en from '../messages/en.json';
import fi from '../messages/fi.json';
import ru from '../messages/ru.json';
import uk from '../messages/uk.json';
import {
  formatDuration,
  recipeMetaLabel,
  recipeTotalMinutes,
  recipeUpdatedLabel,
  splitDuration,
} from './format-recipe-meta';

const allMessages: Record<AppLocale, typeof en> = { en, fi, ru, uk };

const labels = {
  totalTime: (minutes: number) => `${minutes} min`,
  servings: (servings: number) => `${servings} servings`,
};

describe('recipeTotalMinutes', () => {
  it('adds prep and cook time', () => {
    expect(recipeTotalMinutes({ prepMinutes: 15, cookMinutes: 30 })).toBe(45);
  });

  it('uses whichever value exists', () => {
    expect(recipeTotalMinutes({ prepMinutes: null, cookMinutes: 20 })).toBe(20);
  });

  it('returns null for zero or missing values', () => {
    expect(recipeTotalMinutes({ prepMinutes: 0, cookMinutes: 0 })).toBeNull();
    expect(recipeTotalMinutes({})).toBeNull();
  });
});

describe('recipeMetaLabel', () => {
  it('shows total time and servings', () => {
    expect(recipeMetaLabel({ prepMinutes: 10, cookMinutes: 20, servings: 4 }, labels)).toBe(
      '30 min · 4 servings',
    );
  });

  it('leaves out zero and missing values', () => {
    expect(recipeMetaLabel({ prepMinutes: 0, cookMinutes: 0, servings: 0 }, labels)).toBeNull();
    expect(recipeMetaLabel({ cookMinutes: 0, servings: 6 }, labels)).toBe('6 servings');
    expect(recipeMetaLabel({ prepMinutes: 25, servings: null }, labels)).toBe('25 min');
  });
});

describe('recipeUpdatedLabel', () => {
  const now = new Date('2026-11-18T12:00:00Z');
  const formats = {
    relative: (updated: Date, at: Date) =>
      `relative:${Math.floor((at.getTime() - updated.getTime()) / 86_400_000)}`,
    date: (date: Date) => `date:${date.toISOString().slice(0, 10)}`,
  };

  it('is relative on the same day and up to seven days back', () => {
    expect(recipeUpdatedLabel('2026-11-18T08:00:00Z', now, formats)).toBe('relative:0');
    expect(recipeUpdatedLabel('2026-11-17T08:00:00Z', now, formats)).toBe('relative:1');
    expect(recipeUpdatedLabel('2026-11-11T12:00:00Z', now, formats)).toBe('relative:7');
  });

  it('shows only the date after a week', () => {
    expect(recipeUpdatedLabel('2026-11-10T08:00:00Z', now, formats)).toBe('date:2026-11-10');
  });

  it('shows the date for timestamps in the future', () => {
    expect(recipeUpdatedLabel('2026-11-20T08:00:00Z', now, formats)).toBe('date:2026-11-20');
  });
});

describe('splitDuration', () => {
  it('splits hours and minutes', () => {
    expect(splitDuration(65)).toEqual({ hours: 1, minutes: 5 });
    expect(splitDuration(120)).toEqual({ hours: 2, minutes: 0 });
    expect(splitDuration(45)).toEqual({ hours: 0, minutes: 45 });
  });

  it('returns null for missing, zero and negative values', () => {
    expect(splitDuration(null)).toBeNull();
    expect(splitDuration(undefined)).toBeNull();
    expect(splitDuration(0)).toBeNull();
    expect(splitDuration(-5)).toBeNull();
  });
});

describe('formatDuration with the real message catalogs', () => {
  const expected: Record<AppLocale, Readonly<{ min: string; hour: string; both: string }>> = {
    en: { min: '45 min', hour: '2 h', both: '1 h 5 min' },
    fi: { min: '45 min', hour: '2 t', both: '1 t 5 min' },
    ru: { min: '45 мин', hour: '2 ч', both: '1 ч 5 мин' },
    uk: { min: '45 хв', hour: '2 год', both: '1 год 5 хв' },
  };

  for (const locale of locales) {
    it(`formats durations in ${locale}`, () => {
      const t = createTranslator({
        locale,
        messages: allMessages[locale],
        namespace: 'recipes.detail.duration',
      });
      const labels = {
        minutes: (minutes: number) => t('minutes', { minutes }),
        hours: (hours: number) => t('hours', { hours }),
        hoursMinutes: (hours: number, minutes: number) => t('hoursMinutes', { hours, minutes }),
      };
      expect(formatDuration(45, labels)).toBe(expected[locale].min);
      expect(formatDuration(120, labels)).toBe(expected[locale].hour);
      expect(formatDuration(65, labels)).toBe(expected[locale].both);
      expect(formatDuration(0, labels)).toBeNull();
      expect(formatDuration(null, labels)).toBeNull();
    });
  }
});
