'use server';

import { updateFamily } from '@family-cookbook/application';
import { familyIdSchema, updateFamilyInputSchema } from '@family-cookbook/contracts';
import { createServerSupabaseClient } from '@family-cookbook/data-access/supabase/server';
import { cookies } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { LOCALE_COOKIE, parseAppLocale } from '@/lib/locale';

async function actionLocale(): Promise<string> {
  const jar = await cookies();
  return parseAppLocale(jar.get(LOCALE_COOKIE)?.value);
}

function settingsPath(locale: string, familyId: string): string {
  return `/${locale}/f/${familyId}/settings`;
}

export type FamilySettingsActionState =
  | null
  | {
      ok: true;
    }
  | {
      ok: false;
      message: string;
    };

export async function updateFamilySettingsAction(
  _prev: FamilySettingsActionState | null,
  formData: FormData,
): Promise<FamilySettingsActionState> {
  const locale = await actionLocale();
  const t = await getTranslations({ locale, namespace: 'family.settings' });

  const familyParsed = familyIdSchema.safeParse(formData.get('familyId'));
  const nameRaw = formData.get('name');
  const langRaw = formData.get('defaultLanguage');

  const parsed = updateFamilyInputSchema.safeParse({
    familyId: familyParsed.success ? familyParsed.data : undefined,
    name: typeof nameRaw === 'string' ? nameRaw : '',
    defaultLanguage: typeof langRaw === 'string' ? langRaw : '',
  });

  if (!parsed.success) {
    return { ok: false, message: t('errors.validation') };
  }

  const supabase = await createServerSupabaseClient();
  const result = await updateFamily(supabase, parsed.data);

  if (result.status === 'auth_required') {
    redirect(`/${locale}/auth/sign-in?next=${settingsPath(locale, parsed.data.familyId)}`);
  }
  if (result.status === 'validation_error') {
    return { ok: false, message: t('errors.validation') };
  }
  if (result.status === 'forbidden') {
    return { ok: false, message: t('errors.forbidden') };
  }
  if (result.status === 'not_found') {
    return { ok: false, message: t('errors.notFound') };
  }
  if (result.status !== 'ok') {
    return { ok: false, message: t('errors.failed') };
  }

  revalidatePath(settingsPath(locale, parsed.data.familyId));
  revalidatePath(`/${locale}/f/${parsed.data.familyId}`);
  return { ok: true };
}
