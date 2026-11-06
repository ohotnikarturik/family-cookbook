import { describe, expect, it } from 'vitest';

import { PACKAGE_VERSION, permissionsBootstrapMarker } from './index.js';

describe('@family-cookbook/permissions', () => {
  it('exports a package version', () => {
    expect(PACKAGE_VERSION).toBe('0.0.0');
  });

  it('links to domain layer', () => {
    expect(permissionsBootstrapMarker).toBe('0.0.0');
  });
});
