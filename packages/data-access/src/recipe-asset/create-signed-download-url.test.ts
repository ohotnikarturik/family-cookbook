import { describe, expect, it, vi } from 'vitest';

import { createRecipeSignedDownloadUrl } from './create-signed-download-url.js';

describe('createRecipeSignedDownloadUrl', () => {
  it('passes attachment filename to storage', async () => {
    const createSignedUrl = vi.fn().mockResolvedValue({
      data: { signedUrl: 'https://example.test/object?token=eyJleHAiOjE3MDAwMDAwMDB9' },
      error: null,
    });
    const client = {
      storage: { from: () => ({ createSignedUrl }) },
    };

    const result = await createRecipeSignedDownloadUrl(
      client as never,
      'family/recipe/asset/file',
      { downloadFilename: 'scan.pdf' },
    );

    expect(result.ok).toBe(true);
    expect(createSignedUrl).toHaveBeenCalledWith(
      'family/recipe/asset/file',
      600,
      expect.objectContaining({ download: 'scan.pdf' }),
    );
  });
});
