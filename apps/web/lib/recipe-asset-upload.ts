import {
  createRecipeUploadSlotResultSchema,
  finalizeRecipeUploadResultSchema,
  RECIPE_ASSET_ALLOWED_MIME_TYPES,
  RECIPE_ASSET_IMAGE_MAX_BYTES,
  RECIPE_ASSET_PDF_MAX_BYTES,
  type AssetKind,
  type RecipeAssetMimeType,
} from '@family-cookbook/contracts';

export type ClientUploadValidationError = 'unsupported_type' | 'too_large' | 'empty_file';

const ORIGINAL_FILENAME_MAX = 256;

export function sanitizeOriginalFilename(name: string): string | null {
  const base = name.replaceAll('\\', '/').split('/').pop() ?? '';
  let cleaned = '';
  for (const character of base) {
    const code = character.codePointAt(0);
    if (code === undefined || code <= 0x1f || code === 0x7f) {
      continue;
    }
    cleaned += character;
  }
  const trimmed = cleaned.trim();
  if (trimmed.length === 0) {
    return null;
  }
  const characters = Array.from(trimmed);
  return characters.length > ORIGINAL_FILENAME_MAX
    ? characters.slice(0, ORIGINAL_FILENAME_MAX).join('')
    : trimmed;
}

const EXTENSION_MIME: Record<string, RecipeAssetMimeType> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  pdf: 'application/pdf',
};

export function inferRecipeAssetMimeType(file: File): RecipeAssetMimeType | null {
  const fromType = file.type.trim().toLowerCase();
  if (fromType.length > 0) {
    const parsed = RECIPE_ASSET_ALLOWED_MIME_TYPES.find((item) => item === fromType);
    if (parsed) {
      return parsed;
    }
  }
  const name = file.name.trim().toLowerCase();
  const dot = name.lastIndexOf('.');
  if (dot < 0) {
    return null;
  }
  const ext = name.slice(dot + 1);
  return EXTENSION_MIME[ext] ?? null;
}

export function validateClientUploadFile(
  file: File,
  assetKind: AssetKind,
): ClientUploadValidationError | null {
  if (file.size < 1) {
    return 'empty_file';
  }
  const mime = inferRecipeAssetMimeType(file);
  if (!mime) {
    return 'unsupported_type';
  }
  const photoKind =
    assetKind === 'original_photo' || assetKind === 'recipe_photo' || assetKind === 'step_photo';
  if (assetKind === 'original_document' && mime !== 'application/pdf') {
    return 'unsupported_type';
  }
  if (photoKind && mime === 'application/pdf') {
    return 'unsupported_type';
  }
  const maxBytes =
    mime === 'application/pdf' ? RECIPE_ASSET_PDF_MAX_BYTES : RECIPE_ASSET_IMAGE_MAX_BYTES;
  if (file.size > maxBytes) {
    return 'too_large';
  }
  return null;
}

export type RecipeAssetUploadApiError =
  | ClientUploadValidationError
  | 'file_required'
  | 'auth_required'
  | 'forbidden'
  | 'not_found'
  | 'limit_reached'
  | 'rejected'
  | 'slot_failed'
  | 'finalize_failed'
  | 'network';

export type RecipeAssetUploadResult =
  | { ok: true; assetId: string }
  | { ok: false; error: RecipeAssetUploadApiError };

export async function uploadRecipeAssetFile(
  familyId: string,
  recipeId: string,
  file: File,
  assetKind: AssetKind,
): Promise<RecipeAssetUploadResult> {
  const validation = validateClientUploadFile(file, assetKind);
  if (validation) {
    return { ok: false, error: validation };
  }
  const mime = inferRecipeAssetMimeType(file);
  if (!mime) {
    return { ok: false, error: 'unsupported_type' };
  }
  const originalFilename = sanitizeOriginalFilename(file.name);

  let slotResponse: Response;
  try {
    slotResponse = await fetch(uploadSlotUrl(familyId, recipeId), {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assetKind,
        declaredMimeType: mime,
        declaredByteSize: file.size,
        ...(originalFilename ? { originalFilename } : {}),
      }),
    });
  } catch {
    return { ok: false, error: 'network' };
  }

  if (slotResponse.status === 401) {
    return { ok: false, error: 'auth_required' };
  }
  if (slotResponse.status === 403) {
    return { ok: false, error: 'forbidden' };
  }
  if (slotResponse.status === 404) {
    return { ok: false, error: 'not_found' };
  }
  if (slotResponse.status === 409) {
    return { ok: false, error: 'limit_reached' };
  }
  if (!slotResponse.ok) {
    return { ok: false, error: 'slot_failed' };
  }

  const slotParsed = createRecipeUploadSlotResultSchema.safeParse(await readJsonBody(slotResponse));
  if (!slotParsed.success) {
    return { ok: false, error: 'slot_failed' };
  }

  let putResponse: Response;
  try {
    putResponse = await fetch(slotParsed.data.signedUploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': mime },
      body: file,
    });
  } catch {
    await releasePendingUpload(familyId, recipeId, slotParsed.data.assetId);
    return { ok: false, error: 'network' };
  }
  if (!putResponse.ok) {
    await releasePendingUpload(familyId, recipeId, slotParsed.data.assetId);
    return { ok: false, error: 'network' };
  }

  let finalizeResponse: Response;
  try {
    finalizeResponse = await fetch(finalizeUrl(familyId, recipeId, slotParsed.data.assetId), {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
    });
  } catch {
    return { ok: false, error: 'network' };
  }

  if (finalizeResponse.status === 401) {
    return { ok: false, error: 'auth_required' };
  }
  if (finalizeResponse.status === 403) {
    return { ok: false, error: 'forbidden' };
  }
  if (finalizeResponse.status === 422) {
    return { ok: false, error: 'rejected' };
  }
  if (!finalizeResponse.ok) {
    return { ok: false, error: 'finalize_failed' };
  }

  const finalizeParsed = finalizeRecipeUploadResultSchema.safeParse(
    await readJsonBody(finalizeResponse),
  );
  if (!finalizeParsed.success) {
    return { ok: false, error: 'finalize_failed' };
  }

  return { ok: true, assetId: finalizeParsed.data.assetId };
}

function uploadSlotUrl(familyId: string, recipeId: string): string {
  return `/api/families/${encodeURIComponent(familyId)}/recipes/${encodeURIComponent(recipeId)}/uploads`;
}

function finalizeUrl(familyId: string, recipeId: string, assetId: string): string {
  return `${uploadSlotUrl(familyId, recipeId)}/${encodeURIComponent(assetId)}/finalize`;
}

async function readJsonBody(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function releasePendingUpload(
  familyId: string,
  recipeId: string,
  assetId: string,
): Promise<void> {
  try {
    await fetch(finalizeUrl(familyId, recipeId, assetId), {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
    });
  } catch {
    // A failed signed PUT still leaves a pending row. Finalize rejects a missing object
    // and frees the 10-file slot. If this call also fails, the next upload reports the limit.
  }
}
