import { describe, expect, it } from 'vitest';

import { readRecipeSummaryNumber } from './summary-number.js';

describe('readRecipeSummaryNumber', () => {
  it('parses numeric strings and keeps null', () => {
    expect(readRecipeSummaryNumber(null, false)).toBeNull();
    expect(readRecipeSummaryNumber('4.50', false)).toBe(4.5);
    expect(readRecipeSummaryNumber(12, true)).toBe(12);
  });

  it('rejects values that are not finite integers when an integer is required', () => {
    expect(readRecipeSummaryNumber('10.5', true)).toBe('invalid');
    expect(readRecipeSummaryNumber('nope', false)).toBe('invalid');
    expect(readRecipeSummaryNumber('', false)).toBe('invalid');
  });
});
