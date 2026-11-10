'use server';

import {
  createFamily,
  listMyFamilies,
  setActiveFamilyPreference,
} from '@family-cookbook/application';
import { createFamilyInputSchema, familyIdSchema } from '@family-cookbook/contracts';
import { createServerSupabaseClient } from '@family-cookbook/data-access/supabase/server';
import { cookies } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';

import { profileBootstrapHintsFromCookies } from '@/lib/auth-hints';
import { LOCALE_COOKIE, parseAppLocale } from '@/lib/locale';

export type CreateFamilyState = null | { ok: true } | { ok: false; error: string };

async function actionLocale(): Promise<string> {
  const jar = await cookies();
  return parseAppLocale(jar.get(LOCALE_COOKIE)?.value);
}

export async function createFamilyAction(
  _prev: CreateFamilyState | null,
  formData: FormData,
): Promise<CreateFamilyState> {
  const locale = await actionLocale();
  const t = await getTranslations({ locale, namespace: 'onboarding' });

  const nameRaw = formData.get('name');
  const langRaw = formData.get('defaultLanguage');

  const parsed = createFamilyInputSchema.safeParse({
    name: typeof nameRaw === 'string' ? nameRaw : '',
    defaultLanguage: typeof langRaw === 'string' && langRaw.length > 0 ? langRaw : undefined,
  });

  if (!parsed.success) {
    return { ok: false, error: t('errors.validation') };
  }

  const supabase = await createServerSupabaseClient();
  const jar = await cookies();
  const result = await createFamily(supabase, parsed.data, profileBootstrapHintsFromCookies(jar));

  if (result.status === 'auth_required') {
    redirect(`/${locale}/auth/sign-in?next=/${locale}/onboarding`);
  }
  if (result.status === 'validation_error') {
    return { ok: false, error: t('errors.validation') };
  }
  if (result.status === 'bootstrap_failed') {
    return { ok: false, error: t('errors.createFailed') };
  }

  redirect(`/${locale}/f/${result.familyId}`);
}

export async function switchFamilyAction(formData: FormData): Promise<void> {
  const locale = await actionLocale();
  const familyRaw = formData.get('familyId');
  const parsed = familyIdSchema.safeParse(typeof familyRaw === 'string' ? familyRaw : '');

  if (!parsed.success) {
    redirect(`/${locale}/families`);
  }

  const supabase = await createServerSupabaseClient();
  const switched = await setActiveFamilyPreference(supabase, parsed.data);

  if (switched.status === 'auth_required') {
    redirect(`/${locale}/auth/sign-in`);
  }
  if (switched.status !== 'ok') {
    redirect(`/${locale}/families`);
  }

  redirect(`/${locale}/f/${parsed.data}`);
}

export async function loadMyFamiliesForSwitcher() {
  const supabase = await createServerSupabaseClient();
  const listed = await listMyFamilies(supabase);
  if (listed.status !== 'ok') {
    return [];
  }
  return listed.families;
}
