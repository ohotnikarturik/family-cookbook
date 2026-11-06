import { describe, expect, it } from 'vitest';

import { PACKAGE_VERSION } from './index.js';

describe('@family-cookbook/domain', () => {
  it('exports a package version', () => {
    expect(PACKAGE_VERSION).toBe('0.0.0');
  });
});
