import { createHash } from 'node:crypto';

export const ALLOWED_UPLOAD_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const;

export type AllowedUploadMimeType = (typeof ALLOWED_UPLOAD_MIME_TYPES)[number];

export const UPLOAD_IMAGE_MAX_BYTES = 15 * 1024 * 1024;
export const UPLOAD_PDF_MAX_BYTES = 25 * 1024 * 1024;

export type ValidateUploadedBytesInput = {
  bytes: Uint8Array;
  declaredMimeType: AllowedUploadMimeType;
  declaredByteSize: number;
};

export type ValidateUploadedBytesResult =
  | { ok: true; mimeType: AllowedUploadMimeType; byteSize: number; checksumSha256: string }
  | {
      ok: false;
      reason: 'empty' | 'oversize' | 'size_mismatch' | 'unknown_type' | 'mime_mismatch';
    };

function readAscii(bytes: Uint8Array, offset: number, length: number): string {
  return Buffer.from(bytes.slice(offset, offset + length)).toString('ascii');
}

export function detectFileSignature(bytes: Uint8Array): { mimeType: AllowedUploadMimeType } | null {
  if (bytes.length < 4) {
    return null;
  }

  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mimeType: 'image/jpeg' };
  }

  const pngHeader = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (pngHeader.every((value, index) => bytes[index] === value)) {
    return { mimeType: 'image/png' };
  }

  if (readAscii(bytes, 0, 4) === 'RIFF' && readAscii(bytes, 8, 4) === 'WEBP') {
    return { mimeType: 'image/webp' };
  }

  if (readAscii(bytes, 0, 5) === '%PDF-') {
    return { mimeType: 'application/pdf' };
  }

  return null;
}

function maxBytesForMime(mimeType: AllowedUploadMimeType): number {
  return mimeType === 'application/pdf' ? UPLOAD_PDF_MAX_BYTES : UPLOAD_IMAGE_MAX_BYTES;
}

export function validateUploadedBytes(
  input: ValidateUploadedBytesInput,
): ValidateUploadedBytesResult {
  const { bytes, declaredMimeType, declaredByteSize } = input;
  if (bytes.length === 0) {
    return { ok: false, reason: 'empty' };
  }
  if (bytes.length > maxBytesForMime(declaredMimeType)) {
    return { ok: false, reason: 'oversize' };
  }
  if (bytes.length !== declaredByteSize) {
    return { ok: false, reason: 'size_mismatch' };
  }

  const detected = detectFileSignature(bytes);
  if (!detected) {
    return { ok: false, reason: 'unknown_type' };
  }
  if (detected.mimeType !== declaredMimeType) {
    return { ok: false, reason: 'mime_mismatch' };
  }

  const checksumSha256 = createHash('sha256').update(bytes).digest('hex');
  return {
    ok: true,
    mimeType: detected.mimeType,
    byteSize: bytes.length,
    checksumSha256,
  };
}
