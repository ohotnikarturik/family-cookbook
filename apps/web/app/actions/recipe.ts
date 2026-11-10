'use server';

import { createRecipe, updateRecipe } from '@family-cookbook/application';
import {
  createRecipeInputSchema,
  familyIdSchema,
  updateRecipeInputSchema,
} from '@family-cookbook/contracts';
import { createServerSupabaseClient } from '@family-cookbook/data-access/supabase/server';
import { cookies } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';

import {
  draftPathFromSchemaPath,
  draftToCreatePayload,
  draftToUpdatePayload,
  messageKeyForField,
  parseRecipeEditorDraftJson,
  type DraftFieldIssueCode,
  type DraftIndexes,
  type PreservedTranslationCollections,
  type RecipeEditorDraft,
} from '@/lib/recipe-editor';
import { FLASH_NOTICE_COOKIE, RECIPE_SAVED_NOTICE } from '@/lib/flash-notice';
import { LOCALE_COOKIE, parseAppLocale } from '@/lib/locale';

async function actionLocale(): Promise<string> {
  const jar = await cookies();
  return parseAppLocale(jar.get(LOCALE_COOKIE)?.value);
}

export type RecipeEditorActionState = null | {
  ok: false;
  code: 'validation' | 'forbidden' | 'version_conflict' | 'mutation_failed' | 'auth_required';
  message: string;
  draft: RecipeEditorDraft;
  fieldErrors?: Record<string, string>;
  currentVersion?: number;
};

function parsePreservedJson(raw: unknown): PreservedTranslationCollections {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 500_000) {
    return { translations: [], ingredientTranslations: [], stepTranslations: [] };
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== 'object' || parsed === null) {
      return { translations: [], ingredientTranslations: [], stepTranslations: [] };
    }
    const record = parsed as Record<string, unknown>;
    return {
      translations: Array.isArray(record.translations)
        ? (record.translations as PreservedTranslationCollections['translations'])
        : [],
      ingredientTranslations: Array.isArray(record.ingredientTranslations)
        ? (record.ingredientTranslations as PreservedTranslationCollections['ingredientTranslations'])
        : [],
      stepTranslations: Array.isArray(record.stepTranslations)
        ? (record.stepTranslations as PreservedTranslationCollections['stepTranslations'])
        : [],
    };
  } catch {
    return { translations: [], ingredientTranslations: [], stepTranslations: [] };
  }
}

async function validationFailureMessage(locale: string): Promise<string> {
  const t = await getTranslations({ locale, namespace: 'recipes.editor' });
  return t('errors.validation');
}

type EditorTranslator = Awaited<ReturnType<typeof getTranslations>>;

function translateFieldError(
  t: EditorTranslator,
  path: string,
  code: DraftFieldIssueCode | 'schema',
): string {
  switch (messageKeyForField(path, code)) {
    case 'errors.title':
      return t('errors.title');
    case 'errors.sourceLanguage':
      return t('errors.sourceLanguage');
    case 'errors.invalidNumber':
      return t('errors.invalidNumber');
    case 'errors.ingredientName':
      return t('errors.ingredientName');
    case 'errors.stepInstruction':
      return t('errors.stepInstruction');
    case 'errors.required':
      return t('errors.required');
    case 'errors.field':
      return t('errors.field');
  }
}

function localizeFieldErrors(
  t: EditorTranslator,
  draftIssues: Record<string, DraftFieldIssueCode> | null | undefined,
  schemaIssues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey> }> | null,
  indexes: DraftIndexes | null | undefined,
): Record<string, string> {
  const map: Record<string, string> = {};
  const safeIndexes = indexes ?? { ingredients: [], steps: [], tags: [] };
  for (const [path, code] of Object.entries(draftIssues ?? {})) {
    map[path] = translateFieldError(t, path, code);
  }
  if (!schemaIssues) {
    return map;
  }
  for (const issue of schemaIssues) {
    const schemaPath = issue.path
      .map((segment) => (typeof segment === 'number' ? String(segment) : String(segment)))
      .join('.');
    if (schemaPath.length === 0) {
      continue;
    }
    const path = draftPathFromSchemaPath(schemaPath, safeIndexes);
    if (!map[path]) {
      map[path] = translateFieldError(t, path, 'schema');
    }
  }
  return map;
}

export async function createRecipeAction(
  _prev: RecipeEditorActionState | null,
  formData: FormData,
): Promise<RecipeEditorActionState> {
  const locale = await actionLocale();
  const t = await getTranslations({ locale, namespace: 'recipes.editor' });

  const familyRaw = formData.get('familyId');
  const familyParsed = familyIdSchema.safeParse(typeof familyRaw === 'string' ? familyRaw : '');
  if (!familyParsed.success) {
    const draft = parseRecipeEditorDraftJson(formData.get('payload')) ?? emptyDraftFallback();
    return {
      ok: false,
      code: 'validation',
      message: await validationFailureMessage(locale),
      draft,
    };
  }

  const draft = parseRecipeEditorDraftJson(formData.get('payload'));
  if (!draft) {
    return {
      ok: false,
      code: 'validation',
      message: await validationFailureMessage(locale),
      draft: emptyDraftFallback(),
    };
  }

  const mapped = draftToCreatePayload(draft);
  const input = createRecipeInputSchema.safeParse({
    familyId: familyParsed.data,
    recipe: mapped.payload,
  });
  const fieldErrors = localizeFieldErrors(
    t,
    mapped.fieldErrors,
    input.success ? null : input.error.issues,
    mapped.indexes,
  );
  if (!input.success || Object.keys(mapped.fieldErrors).length > 0) {
    return {
      ok: false,
      code: 'validation',
      message: await validationFailureMessage(locale),
      draft,
      ...(Object.keys(fieldErrors).length > 0 ? { fieldErrors } : {}),
    };
  }

  const supabase = await createServerSupabaseClient();
  const result = await createRecipe(supabase, input.data);

  if (result.status === 'auth_required') {
    redirect(`/${locale}/auth/sign-in?next=/${locale}/f/${familyParsed.data}/recipes/new`);
  }
  if (result.status === 'forbidden') {
    return { ok: false, code: 'forbidden', message: t('errors.forbidden'), draft };
  }
  if (result.status === 'validation_error') {
    return {
      ok: false,
      code: 'validation',
      message: await validationFailureMessage(locale),
      draft,
    };
  }
  if (result.status === 'mutation_failed') {
    return { ok: false, code: 'mutation_failed', message: t('errors.saveFailed'), draft };
  }

  await rememberRecipeSaved();
  redirect(`/${locale}/f/${familyParsed.data}/recipes/${result.recipeId}`);
}

export async function updateRecipeAction(
  _prev: RecipeEditorActionState | null,
  formData: FormData,
): Promise<RecipeEditorActionState> {
  const locale = await actionLocale();
  const t = await getTranslations({ locale, namespace: 'recipes.editor' });

  const familyRaw = formData.get('familyId');
  const recipeIdRaw = formData.get('recipeId');
  const versionRaw = formData.get('expectedVersion');

  const familyParsed = familyIdSchema.safeParse(typeof familyRaw === 'string' ? familyRaw : '');
  const recipeId = typeof recipeIdRaw === 'string' && recipeIdRaw.length > 0 ? recipeIdRaw : '';
  const expectedVersion =
    typeof versionRaw === 'string' ? Number.parseInt(versionRaw, 10) : Number.NaN;

  const draft = parseRecipeEditorDraftJson(formData.get('payload'));
  const preserved = parsePreservedJson(formData.get('preserved'));

  if (
    !familyParsed.success ||
    !draft ||
    !Number.isInteger(expectedVersion) ||
    expectedVersion < 1
  ) {
    return {
      ok: false,
      code: 'validation',
      message: await validationFailureMessage(locale),
      draft: draft ?? emptyDraftFallback(),
    };
  }

  const mapped = draftToUpdatePayload(draft, preserved);
  const input = updateRecipeInputSchema.safeParse({
    familyId: familyParsed.data,
    recipeId,
    expectedVersion,
    recipe: mapped.payload,
  });
  const fieldErrors = localizeFieldErrors(
    t,
    mapped.fieldErrors,
    input.success ? null : input.error.issues,
    mapped.indexes,
  );
  if (!input.success || Object.keys(mapped.fieldErrors).length > 0) {
    return {
      ok: false,
      code: 'validation',
      message: await validationFailureMessage(locale),
      draft,
      ...(Object.keys(fieldErrors).length > 0 ? { fieldErrors } : {}),
    };
  }

  const supabase = await createServerSupabaseClient();
  const result = await updateRecipe(supabase, input.data);

  if (result.status === 'auth_required') {
    redirect(
      `/${locale}/auth/sign-in?next=/${locale}/f/${familyParsed.data}/recipes/${recipeId}/edit`,
    );
  }
  if (result.status === 'forbidden') {
    return { ok: false, code: 'forbidden', message: t('errors.forbidden'), draft };
  }
  if (result.status === 'not_found') {
    return { ok: false, code: 'mutation_failed', message: t('errors.saveFailed'), draft };
  }
  if (result.status === 'version_conflict') {
    return {
      ok: false,
      code: 'version_conflict',
      message: t('errors.versionConflict'),
      draft,
      ...(result.currentVersion !== undefined ? { currentVersion: result.currentVersion } : {}),
    };
  }
  if (result.status === 'validation_error') {
    return {
      ok: false,
      code: 'validation',
      message: await validationFailureMessage(locale),
      draft,
    };
  }
  if (result.status === 'mutation_failed') {
    return { ok: false, code: 'mutation_failed', message: t('errors.saveFailed'), draft };
  }

  await rememberRecipeSaved();
  redirect(`/${locale}/f/${familyParsed.data}/recipes/${result.recipeId}`);
}

async function rememberRecipeSaved(): Promise<void> {
  const jar = await cookies();
  jar.set(FLASH_NOTICE_COOKIE, RECIPE_SAVED_NOTICE, {
    path: '/',
    maxAge: 60,
    sameSite: 'lax',
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
  });
}

function emptyDraftFallback(): RecipeEditorDraft {
  return {
    title: '',
    sourceLanguagePreset: 'en',
    sourceLanguageOther: '',
    description: '',
    category: '',
    servings: '',
    prepMinutes: '',
    cookMinutes: '',
    notes: '',
    ingredients: [],
    steps: [],
    tags: [],
  };
}
