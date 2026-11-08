import type { AllowedUploadMimeType } from './file-signature.js';

const MAX_FILENAME_LENGTH = 180;

/**
 * Characters that survive Supabase storage-js `encodeURI` after `URLSearchParams`.
 * Other characters are percent-encoded twice and come back as literal `%XX` text.
 */
const DOWNLOAD_FILENAME_CHARS = /[^A-Za-z0-9 ._-]+/g;

function hasUnsafeFilenameCharacter(value: string): boolean {
  if (value.includes('\\') || value.includes('/')) {
    return true;
  }
  for (const character of value) {
    const code = character.codePointAt(0);
    if (code !== undefined && (code <= 0x1f || code === 0x7f)) {
      return true;
    }
  }
  return false;
}

function extensionFor(mimeType: AllowedUploadMimeType): string {
  switch (mimeType) {
    case 'application/pdf':
      return '.pdf';
    case 'image/png':
      return '.png';
    case 'image/webp':
      return '.webp';
    default:
      return '.jpg';
  }
}

function defaultBasename(mimeType: AllowedUploadMimeType): string {
  return `recipe-${mimeType === 'application/pdf' ? 'source' : 'photo'}${extensionFor(mimeType)}`;
}

/**
 * Produces an ASCII Content-Disposition filename for storage signed download URLs.
 * The original name stays display-only in the page.
 */
export function safeRecipeAssetDownloadFilename(
  originalFilename: string | null | undefined,
  mimeType: AllowedUploadMimeType,
): string {
  const fallback = defaultBasename(mimeType);
  const extension = extensionFor(mimeType);
  if (!originalFilename) {
    return fallback;
  }
  const trimmed = originalFilename.trim();
  if (trimmed.length === 0 || hasUnsafeFilenameCharacter(trimmed)) {
    return fallback;
  }

  const ascii = trimmed
    .replace(DOWNLOAD_FILENAME_CHARS, '_')
    .replace(/_+/g, '_')
    .replace(/\.[A-Za-z0-9]{1,8}$/, '')
    .replace(/^[\s._]+|[\s._]+$/g, '');
  if (!/[A-Za-z0-9]/.test(ascii)) {
    return fallback;
  }

  const base = ascii.slice(0, MAX_FILENAME_LENGTH - extension.length).replace(/[\s._]+$/g, '');
  if (!/[A-Za-z0-9]/.test(base)) {
    return fallback;
  }
  return `${base}${extension}`;
}
