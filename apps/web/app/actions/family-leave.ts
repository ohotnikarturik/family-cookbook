'use server';

import { leaveFamily } from '@family-cookbook/application';
import { familyIdSchema } from '@family-cookbook/contracts';
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

export type LeaveFamilyActionState = null | {
  ok: false;
  message: string;
};

export async function leaveFamilyAction(
  _prev: LeaveFamilyActionState | null,
  formData: FormData,
): Promise<LeaveFamilyActionState> {
  const locale = await actionLocale();
  const t = await getTranslations({ locale, namespace: 'family.leave' });

  const familyParsed = familyIdSchema.safeParse(formData.get('familyId'));
  if (!familyParsed.success) {
    return { ok: false, message: t('errors.validation') };
  }
  const familyId = familyParsed.data;

  const supabase = await createServerSupabaseClient();
  // The dialog is the confirmation; the use case still requires `confirm: true`.
  const result = await leaveFamily(supabase, { familyId, confirm: true });

  if (result.status === 'auth_required') {
    redirect(`/${locale}/auth/sign-in?next=/${locale}/f/${familyId}/settings`);
  }
  if (result.status === 'validation_error') {
    return { ok: false, message: t('errors.validation') };
  }
  if (result.status === 'forbidden') {
    return { ok: false, message: t('errors.forbidden') };
  }
  if (result.status === 'sole_owner') {
    return { ok: false, message: t('errors.soleOwner') };
  }
  if (result.status !== 'ok') {
    return { ok: false, message: t('errors.failed') };
  }

  revalidatePath(`/${locale}/families`);
  redirect(`/${locale}/families`);
}
