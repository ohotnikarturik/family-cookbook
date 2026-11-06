import { describe, expect, it } from 'vitest';

import { applicationBootstrapMarker, PACKAGE_VERSION } from './index.js';

describe('@family-cookbook/application', () => {
  it('exports a package version', () => {
    expect(PACKAGE_VERSION).toBe('0.0.0');
  });

  it('composes lower layers', () => {
    expect(applicationBootstrapMarker).toEqual({
      contracts: '0.0.0',
      domain: '0.0.0',
      permissions: '0.0.0',
    });
  });
});
