import { describe, expect, it } from 'vitest';

import { detectFileSignature, validateUploadedBytes } from './file-signature.js';

// Minimal valid structures (not full files) — enough for magic-byte checks in tests.
const MINIMAL_PNG = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x00,
]);
const MINIMAL_JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x00]);
const MINIMAL_WEBP = new Uint8Array([
  ...Buffer.from('RIFF', 'ascii'),
  0x00,
  0x00,
  0x00,
  0x00,
  ...Buffer.from('WEBP', 'ascii'),
  0x00,
]);
const MINIMAL_PDF = new Uint8Array([...Buffer.from('%PDF-1.4\n', 'ascii'), 0x00]);
const HTML_SPOOF = new Uint8Array([...Buffer.from('<!DOCTYPE html>', 'ascii')]);

describe('detectFileSignature', () => {
  it('detects allowlisted formats', () => {
    expect(detectFileSignature(MINIMAL_PNG)?.mimeType).toBe('image/png');
    expect(detectFileSignature(MINIMAL_JPEG)?.mimeType).toBe('image/jpeg');
    expect(detectFileSignature(MINIMAL_WEBP)?.mimeType).toBe('image/webp');
    expect(detectFileSignature(MINIMAL_PDF)?.mimeType).toBe('application/pdf');
    expect(detectFileSignature(HTML_SPOOF)).toBeNull();
  });
});

describe('validateUploadedBytes', () => {
  it('accepts matching declared type and size', () => {
    const result = validateUploadedBytes({
      bytes: MINIMAL_PNG,
      declaredMimeType: 'image/png',
      declaredByteSize: MINIMAL_PNG.length,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.mimeType).toBe('image/png');
      expect(result.checksumSha256).toHaveLength(64);
    }
  });

  it('rejects mime spoofing', () => {
    const result = validateUploadedBytes({
      bytes: MINIMAL_PNG,
      declaredMimeType: 'image/jpeg',
      declaredByteSize: MINIMAL_PNG.length,
    });
    expect(result).toEqual({ ok: false, reason: 'mime_mismatch' });
  });

  it('rejects unknown content', () => {
    const result = validateUploadedBytes({
      bytes: HTML_SPOOF,
      declaredMimeType: 'image/png',
      declaredByteSize: HTML_SPOOF.length,
    });
    expect(result).toEqual({ ok: false, reason: 'unknown_type' });
  });
});
