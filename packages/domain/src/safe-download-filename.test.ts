import { describe, expect, it } from 'vitest';

import { safeRecipeAssetDownloadFilename } from './safe-download-filename.js';

describe('safeRecipeAssetDownloadFilename', () => {
  it('uses fallback when filename is missing or unsafe', () => {
    expect(safeRecipeAssetDownloadFilename(null, 'application/pdf')).toBe('recipe-source.pdf');
    expect(safeRecipeAssetDownloadFilename('bad/path.pdf', 'application/pdf')).toBe(
      'recipe-source.pdf',
    );
  });

  it('keeps a safe original filename', () => {
    expect(safeRecipeAssetDownloadFilename('grandma-scan.pdf', 'application/pdf')).toBe(
      'grandma-scan.pdf',
    );
  });

  it('keeps only characters the signed download query can round-trip', () => {
    expect(safeRecipeAssetDownloadFilename('mummon sämpylät.pdf', 'application/pdf')).toBe(
      'mummon s_mpyl_t.pdf',
    );
    expect(safeRecipeAssetDownloadFilename('рецепт.pdf', 'application/pdf')).toBe(
      'recipe-source.pdf',
    );
    expect(safeRecipeAssetDownloadFilename('scan"copy.pdf', 'application/pdf')).toBe(
      'scan_copy.pdf',
    );
  });
});
