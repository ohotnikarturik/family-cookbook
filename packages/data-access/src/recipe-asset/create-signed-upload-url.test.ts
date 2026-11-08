import { describe, expect, it } from 'vitest';

import { signedUploadExpiresAt } from './create-signed-upload-url.js';

describe('signedUploadExpiresAt', () => {
  it('uses the token exp claim when the signed URL carries a JWT', () => {
    const exp = 1_763_000_000;
    const payload = Buffer.from(JSON.stringify({ exp })).toString('base64url');
    const signedUrl = `https://storage.example/object/upload/sign/bucket/path?token=header.${payload}.sig`;

    expect(signedUploadExpiresAt(signedUrl, 0)).toBe(new Date(exp * 1000).toISOString());
  });

  it('falls back to the 10 minute guidance when the token has no exp', () => {
    expect(signedUploadExpiresAt('https://storage.example/upload', 0)).toBe(
      new Date(600 * 1000).toISOString(),
    );
  });
});
