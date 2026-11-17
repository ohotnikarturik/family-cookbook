import { describe, expect, it } from 'vitest';

import { recipeMetaLabel, recipeTotalMinutes, recipeUpdatedLabel } from './format-recipe-meta';

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
