import { describe, expect, it } from 'vitest';

import { advanceBaseline, isFormDirty } from './form-dirty';

describe('isFormDirty', () => {
  it('is false for identical values', () => {
    expect(isFormDirty({ name: 'Home', lang: 'en' }, { name: 'Home', lang: 'en' })).toBe(false);
  });

  it('is true when a value changed', () => {
    expect(isFormDirty({ name: 'Home', lang: 'en' }, { name: 'Home 2', lang: 'en' })).toBe(true);
  });

  it('is false again when the value is reverted to the original', () => {
    const initial = { name: 'Home', tags: ['a', 'b'] };
    expect(isFormDirty(initial, { name: 'Home!', tags: ['a', 'b'] })).toBe(true);
    expect(isFormDirty(initial, { name: 'Home', tags: ['a', 'b'] })).toBe(false);
  });

  it('ignores object key order', () => {
    expect(isFormDirty({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(false);
  });

  it('compares nested arrays and objects by value, and array order matters', () => {
    expect(isFormDirty({ list: [{ x: 1 }, { x: 2 }] }, { list: [{ x: 1 }, { x: 2 }] })).toBe(false);
    expect(isFormDirty({ list: [{ x: 1 }, { x: 2 }] }, { list: [{ x: 2 }, { x: 1 }] })).toBe(true);
    expect(isFormDirty({ list: [1] }, { list: [1, 2] })).toBe(true);
  });

  it('treats a missing key and an extra key as a change', () => {
    expect(isFormDirty({ a: 1 }, { a: 1, b: undefined })).toBe(true);
    expect(isFormDirty({ a: 1, b: 2 }, { a: 1 })).toBe(true);
  });

  it('does not treat an empty string and a missing value as equal', () => {
    expect(isFormDirty({ a: '' }, { a: null })).toBe(true);
  });
});

describe('advanceBaseline', () => {
  const start = { baseline: { name: 'Home' }, seenSignal: null };

  it('keeps the baseline when there is no save signal', () => {
    expect(advanceBaseline(start, { name: 'Typed' }, null)).toBe(start);
  });

  it('moves the baseline to the current values after a successful save', () => {
    const saved = {};
    const next = advanceBaseline(start, { name: 'Typed' }, saved);
    expect(next.baseline).toEqual({ name: 'Typed' });
    expect(isFormDirty(next.baseline, { name: 'Typed' })).toBe(false);
  });

  it('does not move the baseline again for the same signal', () => {
    const saved = {};
    const first = advanceBaseline(start, { name: 'Typed' }, saved);
    const again = advanceBaseline(first, { name: 'Typed more' }, saved);
    expect(again).toBe(first);
    expect(isFormDirty(again.baseline, { name: 'Typed more' })).toBe(true);
  });

  it('moves the baseline for each new save', () => {
    const first = advanceBaseline(start, { name: 'One' }, {});
    const second = advanceBaseline(first, { name: 'Two' }, {});
    expect(second.baseline).toEqual({ name: 'Two' });
  });
});
