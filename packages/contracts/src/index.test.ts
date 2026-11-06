import { describe, expect, it } from 'vitest';

import { bootstrapHealthSchema, PACKAGE_VERSION } from './index.js';

describe('@family-cookbook/contracts', () => {
  it('exports a package version', () => {
    expect(PACKAGE_VERSION).toBe('0.0.0');
  });

  it('validates bootstrap health payload', () => {
    expect(bootstrapHealthSchema.parse({ status: 'ok' })).toEqual({ status: 'ok' });
  });
});
