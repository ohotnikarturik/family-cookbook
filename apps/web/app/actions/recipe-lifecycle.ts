'use server';

import { archiveRecipe, restoreRecipe } from '@family-cookbook/application';
import { createServerSupabaseClient } from '@family-cookbook/data-access/supabase/server';
import { cookies } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';

import { LOCALE_COOKIE, parseAppLocale } from '@/lib/locale';
import { parseArchiveLifecycleForm, parseRestoreLifecycleForm } from '@/lib/recipe-lifecycle-form';

async function actionLocale(): Promise<string> {
  const jar = await cookies();
  return parseAppLocale(jar.get(LOCALE_COOKIE)?.value);
}

export type RecipeLifecycleActionState = null | {
  ok: false;
  code:
    | 'validation'
    | 'forbidden'
    | 'not_found'
    | 'version_conflict'
    | 'mutation_failed'
    | 'auth_required';
  message: string;
  currentVersion?: number;
};

function recipePath(locale: string, familyId: string, recipeId: string): string {
  return `/${locale}/f/${familyId}/recipes/${recipeId}`;
}

export async function archiveRecipeAction(
  _prev: RecipeLifecycleActionState | null,
  formData: FormData,
): Promise<RecipeLifecycleActionState> {
  const locale = await actionLocale();
  const t = await getTranslations({ locale, namespace: 'recipes.lifecycle' });
  const parsed = parseArchiveLifecycleForm(formData);
  if (!parsed.ok) {
    return {
      ok: false,
      code: 'validation',
      message:
        parsed.reason === 'confirm_required' ? t('errors.confirmRequired') : t('errors.validation'),
    };
  }

  const { familyId, recipeId } = parsed.input;
  const supabase = await createServerSupabaseClient();
  const result = await archiveRecipe(supabase, parsed.input);

  if (result.status === 'auth_required') {
    redirect(`/${locale}/auth/sign-in?next=${recipePath(locale, familyId, recipeId)}`);
  }
  if (result.status === 'forbidden') {
    return { ok: false, code: 'forbidden', message: t('errors.forbidden') };
  }
  if (result.status === 'not_found') {
    return { ok: false, code: 'not_found', message: t('errors.notFound') };
  }
  if (result.status === 'version_conflict') {
    return {
      ok: false,
      code: 'version_conflict',
      message: t('errors.versionConflict'),
      ...(result.currentVersion !== undefined ? { currentVersion: result.currentVersion } : {}),
    };
  }
  if (result.status !== 'ok') {
    return { ok: false, code: 'mutation_failed', message: t('errors.failed') };
  }

  redirect(recipePath(locale, familyId, recipeId));
}

export async function restoreRecipeAction(
  _prev: RecipeLifecycleActionState | null,
  formData: FormData,
): Promise<RecipeLifecycleActionState> {
  const locale = await actionLocale();
  const t = await getTranslations({ locale, namespace: 'recipes.lifecycle' });
  const parsed = parseRestoreLifecycleForm(formData);
  if (!parsed.ok) {
    return { ok: false, code: 'validation', message: t('errors.validation') };
  }

  const { familyId, recipeId } = parsed.input;
  const supabase = await createServerSupabaseClient();
  const result = await restoreRecipe(supabase, parsed.input);

  if (result.status === 'auth_required') {
    redirect(`/${locale}/auth/sign-in?next=${recipePath(locale, familyId, recipeId)}`);
  }
  if (result.status === 'forbidden') {
    return { ok: false, code: 'forbidden', message: t('errors.forbidden') };
  }
  if (result.status === 'not_found') {
    return { ok: false, code: 'not_found', message: t('errors.notFound') };
  }
  if (result.status === 'version_conflict') {
    return {
      ok: false,
      code: 'version_conflict',
      message: t('errors.versionConflict'),
      ...(result.currentVersion !== undefined ? { currentVersion: result.currentVersion } : {}),
    };
  }
  if (result.status !== 'ok') {
    return { ok: false, code: 'mutation_failed', message: t('errors.failed') };
  }

  redirect(recipePath(locale, familyId, recipeId));
}
