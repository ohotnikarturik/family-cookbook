'use server';

import { getOwnProfile, updateOwnProfile } from '@family-cookbook/application';
import { type OwnProfile, updateProfileInputSchema } from '@family-cookbook/contracts';
import { createServerSupabaseClient } from '@family-cookbook/data-access/supabase/server';
import { cookies } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { LOCALE_COOKIE, parseAppLocale } from '@/lib/locale';
import { writeProfilePreferenceCookies } from '@/lib/profile-preference-cookies';
import { type ThemePreference } from '@/lib/theme';

function preferencesPath(locale: string): string {
  return `/${locale}/account/preferences`;
}

export type AccountProfileActionState =
  | null
  | {
      ok: true;
      themePreference: ThemePreference;
    }
  | {
      ok: false;
      message: string;
    };

async function actionLocale(): Promise<string> {
  const jar = await cookies();
  return parseAppLocale(jar.get(LOCALE_COOKIE)?.value);
}

export async function updateAccountProfileAction(
  _prev: AccountProfileActionState | null,
  formData: FormData,
): Promise<AccountProfileActionState> {
  const locale = await actionLocale();
  const t = await getTranslations({ locale, namespace: 'account.preferences' });

  const parsed = updateProfileInputSchema.safeParse({
    displayName: typeof formData.get('displayName') === 'string' ? formData.get('displayName') : '',
    preferredLanguage:
      typeof formData.get('preferredLanguage') === 'string' ? formData.get('preferredLanguage') : '',
    themePreference:
      typeof formData.get('themePreference') === 'string' ? formData.get('themePreference') : '',
  });

  if (!parsed.success) {
    return { ok: false, message: t('errors.validation') };
  }

  const supabase = await createServerSupabaseClient();
  const result = await updateOwnProfile(supabase, parsed.data);

  if (result.status === 'auth_required') {
    redirect(`/${locale}/auth/sign-in?next=${preferencesPath(locale)}`);
  }
  if (result.status === 'validation_error') {
    return { ok: false, message: t('errors.validation') };
  }
  if (result.status === 'not_found') {
    return { ok: false, message: t('errors.notFound') };
  }
  if (result.status !== 'ok') {
    return { ok: false, message: t('errors.failed') };
  }

  const jar = await cookies();
  writeProfilePreferenceCookies(jar, parsed.data);

  const nextLocale = parsed.data.preferredLanguage;
  revalidatePath(preferencesPath(locale));
  revalidatePath(preferencesPath(nextLocale));
  revalidatePath(`/${locale}/account`);
  revalidatePath(`/${nextLocale}/account`);

  if (nextLocale !== locale) {
    redirect(preferencesPath(nextLocale));
  }

  return { ok: true, themePreference: parsed.data.themePreference };
}

export async function persistSignedInUiPreferences(
  patch: Partial<Pick<OwnProfile, 'preferredLanguage' | 'themePreference'>>,
): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const loaded = await getOwnProfile(supabase);
  if (loaded.status !== 'ok') {
    return;
  }

  const next = {
    displayName: loaded.profile.displayName,
    preferredLanguage: patch.preferredLanguage ?? loaded.profile.preferredLanguage,
    themePreference: patch.themePreference ?? loaded.profile.themePreference,
  };

  const updated = await updateOwnProfile(supabase, next);
  if (updated.status !== 'ok') {
    return;
  }

  writeProfilePreferenceCookies(await cookies(), next);
}
