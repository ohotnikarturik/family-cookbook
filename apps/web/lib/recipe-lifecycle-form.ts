import {
  archiveRecipeInputSchema,
  familyIdSchema,
  restoreRecipeInputSchema,
  type ArchiveRecipeInput,
  type RestoreRecipeInput,
} from '@family-cookbook/contracts';

export type LifecycleFormParseFailure = 'validation' | 'confirm_required';

export type ArchiveLifecycleFormResult =
  | { ok: true; input: ArchiveRecipeInput }
  | { ok: false; reason: LifecycleFormParseFailure };

export type RestoreLifecycleFormResult =
  | { ok: true; input: RestoreRecipeInput }
  | { ok: false; reason: 'validation' };

export function parseExpectedVersion(raw: FormDataEntryValue | null): number | null {
  if (typeof raw !== 'string' || !/^[1-9]\d*$/.test(raw)) {
    return null;
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1) {
    return null;
  }
  return value;
}

export function parseArchiveLifecycleForm(formData: FormData): ArchiveLifecycleFormResult {
  const familyParsed = familyIdSchema.safeParse(formData.get('familyId'));
  const recipeRaw = formData.get('recipeId');
  const recipeId = typeof recipeRaw === 'string' ? recipeRaw : '';
  const expectedVersion = parseExpectedVersion(formData.get('expectedVersion'));

  if (!familyParsed.success || recipeId.length === 0 || expectedVersion === null) {
    return { ok: false, reason: 'validation' };
  }
  if (formData.get('confirm') !== 'true') {
    return { ok: false, reason: 'confirm_required' };
  }

  const input = archiveRecipeInputSchema.safeParse({
    familyId: familyParsed.data,
    recipeId,
    expectedVersion,
    confirm: true as const,
  });
  if (!input.success) {
    return { ok: false, reason: 'validation' };
  }
  return { ok: true, input: input.data };
}

export function parseRestoreLifecycleForm(formData: FormData): RestoreLifecycleFormResult {
  const familyParsed = familyIdSchema.safeParse(formData.get('familyId'));
  const recipeRaw = formData.get('recipeId');
  const recipeId = typeof recipeRaw === 'string' ? recipeRaw : '';
  const expectedVersion = parseExpectedVersion(formData.get('expectedVersion'));

  if (!familyParsed.success || recipeId.length === 0 || expectedVersion === null) {
    return { ok: false, reason: 'validation' };
  }

  const input = restoreRecipeInputSchema.safeParse({
    familyId: familyParsed.data,
    recipeId,
    expectedVersion,
  });
  if (!input.success) {
    return { ok: false, reason: 'validation' };
  }
  return { ok: true, input: input.data };
}
