'use server';

import { upsertRecipeTranslations } from '@family-cookbook/application';
import { upsertRecipeTranslationInputSchema } from '@family-cookbook/contracts';
import { createServerSupabaseClient } from '@family-cookbook/data-access/supabase/server';
import { getTranslations } from 'next-intl/server';
import { revalidatePath } from 'next/cache';

import { LOCALE_COOKIE, parseAppLocale } from '@/lib/locale';
import { cookies } from 'next/headers';

export type TranslationActionErrorCode =
  | 'validation'
  | 'forbidden'
  | 'version_conflict'
  | 'mutation_failed'
  | 'auth_required';

export type TranslationActionState =
  | null
  | { ok: true; message: string; version: number }
  | {
      ok: false;
      code: TranslationActionErrorCode;
      message: string;
      currentVersion?: number;
    };

async function actionLocale(): Promise<string> {
  const jar = await cookies();
  return parseAppLocale(jar.get(LOCALE_COOKIE)?.value);
}

export async function saveRecipeTranslationAction(
  _prev: TranslationActionState,
  formData: FormData,
): Promise<TranslationActionState> {
  const locale = await actionLocale();
  const t = await getTranslations({ locale, namespace: 'recipes.translationEditor' });

  const familyId = formData.get('familyId');
  const recipeId = formData.get('recipeId');
  const languageTag = formData.get('languageTag');
  const expectedVersion = formData.get('expectedVersion');
  const payloadRaw = formData.get('payload');

  let translation: unknown;
  try {
    translation =
      typeof payloadRaw === 'string' && payloadRaw.length > 0 ? JSON.parse(payloadRaw) : null;
  } catch {
    return { ok: false, code: 'validation', message: t('errors.validation') };
  }

  const parsed = upsertRecipeTranslationInputSchema.safeParse({
    familyId,
    recipeId,
    languageTag,
    expectedVersion: Number(expectedVersion),
    translation,
  });

  if (!parsed.success) {
    return { ok: false, code: 'validation', message: t('errors.validation') };
  }

  const client = await createServerSupabaseClient();
  const result = await upsertRecipeTranslations(client, parsed.data);

  if (result.status === 'auth_required') {
    return { ok: false, code: 'auth_required', message: t('errors.auth') };
  }
  if (result.status === 'forbidden') {
    return { ok: false, code: 'forbidden', message: t('errors.forbidden') };
  }
  if (result.status === 'validation_error') {
    return { ok: false, code: 'validation', message: t('errors.validation') };
  }
  if (result.status === 'version_conflict') {
    return {
      ok: false,
      code: 'version_conflict',
      message: t('errors.versionConflict'),
      ...(result.currentVersion === undefined ? {} : { currentVersion: result.currentVersion }),
    };
  }
  if (result.status !== 'ok') {
    return { ok: false, code: 'mutation_failed', message: t('errors.saveFailed') };
  }

  const recipePath = `/${locale}/f/${parsed.data.familyId}/recipes/${parsed.data.recipeId}`;
  revalidatePath(recipePath);
  revalidatePath(`${recipePath}/translations`);
  revalidatePath(`${recipePath}/translations/${parsed.data.languageTag}`);
  revalidatePath(`${recipePath}/history`);
  return { ok: true, message: t('saved'), version: result.version };
}
