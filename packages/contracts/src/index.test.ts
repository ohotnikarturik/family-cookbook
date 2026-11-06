import { describe, expect, it } from 'vitest';

import { bootstrapHealthSchema, PACKAGE_VERSION, sampleDisplayNameSchema } from './index.js';

describe('@family-cookbook/contracts', () => {
  it('exports a package version', () => {
    expect(PACKAGE_VERSION).toBe('0.0.0');
  });

  it('validates bootstrap health payload', () => {
    expect(bootstrapHealthSchema.parse({ status: 'ok' })).toEqual({ status: 'ok' });
  });

  it('accepts a trimmed display name and rejects bounds', () => {
    expect(sampleDisplayNameSchema.parse({ displayName: '  Ana  ' })).toEqual({
      displayName: 'Ana',
    });

    const tooSmall = sampleDisplayNameSchema.safeParse({ displayName: 'a' });
    expect(tooSmall.success).toBe(false);
    if (!tooSmall.success) {
      expect(tooSmall.error.issues[0]).toMatchObject({ code: 'too_small', origin: 'string' });
    }

    const tooBig = sampleDisplayNameSchema.safeParse({ displayName: 'x'.repeat(81) });
    expect(tooBig.success).toBe(false);
    if (!tooBig.success) {
      expect(tooBig.error.issues[0]).toMatchObject({ code: 'too_big', origin: 'string' });
    }
  });
});
