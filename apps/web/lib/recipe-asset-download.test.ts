import { describe, expect, it } from 'vitest';

import { isDisplayableAssetDownload } from './recipe-asset-download';

const image = {
  signedDownloadUrl: 'https://storage.example/photo',
  expiresAt: '2026-11-09T00:00:00.000Z',
  disposition: 'inline' as const,
  detectedMimeType: 'image/jpeg' as const,
};

describe('isDisplayableAssetDownload', () => {
  it('allows an inline image and an attached PDF only in their own slots', () => {
    expect(isDisplayableAssetDownload(image, 'image')).toBe(true);
    expect(isDisplayableAssetDownload(image, 'pdf')).toBe(false);
    const pdf = {
      ...image,
      disposition: 'attachment' as const,
      detectedMimeType: 'application/pdf' as const,
    };
    expect(isDisplayableAssetDownload(pdf, 'pdf')).toBe(true);
    expect(isDisplayableAssetDownload(pdf, 'image')).toBe(false);
  });
});
