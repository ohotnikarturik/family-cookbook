import { describe, expect, it, vi } from 'vitest';

import {
  inferRecipeAssetMimeType,
  sanitizeOriginalFilename,
  uploadRecipeAssetFile,
  validateClientUploadFile,
} from './recipe-asset-upload';

function fileLike(name: string, type: string, size: number): File {
  return new File([new Uint8Array(size)], name, { type });
}

describe('inferRecipeAssetMimeType', () => {
  it('uses the browser type when allowed', () => {
    expect(inferRecipeAssetMimeType(fileLike('x.bin', 'image/png', 1))).toBe('image/png');
  });

  it('falls back to extension when type is empty', () => {
    expect(inferRecipeAssetMimeType(fileLike('scan.pdf', '', 1))).toBe('application/pdf');
    expect(inferRecipeAssetMimeType(fileLike('photo.JPEG', '', 1))).toBe('image/jpeg');
  });
});

describe('validateClientUploadFile', () => {
  it('rejects PDF for photo kinds and images for original_document', () => {
    const pdf = fileLike('a.pdf', 'application/pdf', 100);
    expect(validateClientUploadFile(pdf, 'recipe_photo')).toBe('unsupported_type');
    expect(validateClientUploadFile(pdf, 'step_photo')).toBe('unsupported_type');
    const png = fileLike('a.png', 'image/png', 100);
    expect(validateClientUploadFile(png, 'original_document')).toBe('unsupported_type');
  });

  it('rejects oversize files', () => {
    const huge = fileLike('big.png', 'image/png', 16 * 1024 * 1024);
    expect(validateClientUploadFile(huge, 'recipe_photo')).toBe('too_large');
  });

  it('rejects an empty file', () => {
    expect(validateClientUploadFile(fileLike('a.png', 'image/png', 0), 'recipe_photo')).toBe(
      'empty_file',
    );
  });
});

describe('sanitizeOriginalFilename', () => {
  it('drops a path and control characters', () => {
    expect(sanitizeOriginalFilename('C:\\scans\\page.png')).toBe('page.png');
    expect(sanitizeOriginalFilename('folder/photo.jpg')).toBe('photo.jpg');
    expect(sanitizeOriginalFilename('bad\u0000name.png')).toBe('badname.png');
    expect(sanitizeOriginalFilename('   ')).toBeNull();
  });
});

describe('uploadRecipeAssetFile', () => {
  const assetId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001';
  const checksum = 'ab'.repeat(32);

  it('asks finalize to reject the slot when the signed upload fails', async () => {
    const calls: string[] = [];
    vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push(`${init?.method ?? 'GET'} ${url}`);
      if (url.endsWith('/uploads')) {
        return new Response(
          JSON.stringify({
            assetId,
            objectPath: 'family/recipe/asset/file',
            signedUploadUrl: 'https://storage.example/upload',
            expiresAt: '2026-11-09T00:00:00.000Z',
          }),
          { status: 201 },
        );
      }
      if (url === 'https://storage.example/upload') {
        return new Response('no', { status: 500 });
      }
      return new Response(null, { status: 422 });
    });

    const result = await uploadRecipeAssetFile(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'eeeeeeee-eeee-4eee-8eee-eeeeeeee0101',
      fileLike('dish.png', 'image/png', 8),
      'recipe_photo',
    );

    expect(result).toEqual({ ok: false, error: 'network' });
    expect(calls).toContain(
      'POST /api/families/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/recipes/eeeeeeee-eeee-4eee-8eee-eeeeeeee0101/uploads/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001/finalize',
    );
    vi.unstubAllGlobals();
  });

  it('returns the asset id after a successful finalize', async () => {
    let slotBody = '';
    vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/uploads')) {
        slotBody = typeof init?.body === 'string' ? init.body : '';
        return new Response(
          JSON.stringify({
            assetId,
            objectPath: 'family/recipe/asset/file',
            signedUploadUrl: 'https://storage.example/upload',
            expiresAt: '2026-11-09T00:00:00.000Z',
          }),
          { status: 201 },
        );
      }
      if (url === 'https://storage.example/upload') {
        return new Response(null, { status: 200 });
      }
      return new Response(
        JSON.stringify({
          assetId,
          processingStatus: 'available',
          detectedMimeType: 'image/png',
          byteSize: 8,
          checksumSha256: checksum,
        }),
        { status: 200 },
      );
    });

    const result = await uploadRecipeAssetFile(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'eeeeeeee-eeee-4eee-8eee-eeeeeeee0101',
      fileLike('scans/dish.png', 'image/png', 8),
      'recipe_photo',
    );
    expect(result).toEqual({ ok: true, assetId });
    expect(JSON.parse(slotBody)).toMatchObject({ originalFilename: 'dish.png' });
    vi.unstubAllGlobals();
  });
});
