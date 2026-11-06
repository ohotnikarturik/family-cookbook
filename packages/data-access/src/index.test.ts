import { describe, expect, it } from 'vitest';

import { dataAccessBootstrapMarker, PACKAGE_VERSION } from './index.js';

describe('@family-cookbook/data-access', () => {
  it('exports a package version', () => {
    expect(PACKAGE_VERSION).toBe('0.0.0');
  });

  it('links to contracts layer', () => {
    expect(dataAccessBootstrapMarker).toBe('0.0.0');
  });
});
