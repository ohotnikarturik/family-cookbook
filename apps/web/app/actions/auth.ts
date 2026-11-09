'use server';

import { authEmailOtpSchema, authEmailSchema } from '@family-cookbook/contracts';
import {
  buildAuthCallbackUrl,
  resolveAuthAppOrigin,
  sanitizeAuthRedirect,
} from '@family-cookbook/data-access';
import { createServerSupabaseClient } from '@family-cookbook/data-access/supabase/server';
import { cookies, headers } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';

import { profileBootstrapHintsFromCookies } from '@/lib/auth-hints';
import { ensureProfileForSession } from '@/lib/ensure-profile-session';
import { LOCALE_COOKIE, parseAppLocale } from '@/lib/locale';
import { resolveSignedInLandingPath } from '@/lib/post-auth-path';
import type { AppLocale } from '@/i18n/routing';

export type MagicLinkState =
  | null
  | { ok: true; step: 'email_sent'; email: string }
  | { ok: false; error: string };

export type VerifyOtpState = null | { ok: true } | { ok: false; error: string };

async function authLocale(): Promise<string> {
  const jar = await cookies();
  return parseAppLocale(jar.get(LOCALE_COOKIE)?.value);
}

async function callbackOrigin(): Promise<string> {
  const host = (await headers()).get('host');
  return resolveAuthAppOrigin(host);
}

function optionalNextPath(raw: FormDataEntryValue | null): string | undefined {
  if (typeof raw !== 'string' || raw.trim() === '') {
    return undefined;
  }
  return sanitizeAuthRedirect(raw, '');
}

function safeNextPath(raw: FormDataEntryValue | null, fallback: string): string {
  return sanitizeAuthRedirect(typeof raw === 'string' ? raw : null, fallback);
}

export async function requestMagicLinkAction(
  _prev: MagicLinkState | null,
  formData: FormData,
): Promise<MagicLinkState> {
  const locale = await authLocale();
  const t = await getTranslations({ locale, namespace: 'auth' });

  const rawEmail = formData.get('email');
  const emailParsed = authEmailSchema.safeParse(typeof rawEmail === 'string' ? rawEmail : '');
  if (!emailParsed.success) {
    return { ok: false, error: t('errors.invalidEmail') };
  }

  const nextPath = optionalNextPath(formData.get('next'));
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: emailParsed.data,
    options: {
      emailRedirectTo: buildAuthCallbackUrl(nextPath, await callbackOrigin()),
    },
  });

  if (error) {
    return { ok: false, error: t('errors.sendFailed') };
  }

  return { ok: true, step: 'email_sent', email: emailParsed.data };
}

export async function verifyEmailOtpAction(
  _prev: VerifyOtpState | null,
  formData: FormData,
): Promise<VerifyOtpState> {
  const locale = await authLocale();
  const t = await getTranslations({ locale, namespace: 'auth' });

  const emailParsed = authEmailSchema.safeParse(
    typeof formData.get('email') === 'string' ? formData.get('email') : '',
  );
  const tokenParsed = authEmailOtpSchema.safeParse(
    typeof formData.get('token') === 'string' ? formData.get('token') : '',
  );

  if (!emailParsed.success || !tokenParsed.success) {
    return { ok: false, error: t('errors.invalidOtp') };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.verifyOtp({
    email: emailParsed.data,
    token: tokenParsed.data,
    type: 'email',
  });

  if (error) {
    return { ok: false, error: t('errors.verifyFailed') };
  }

  const jar = await cookies();
  await ensureProfileForSession(supabase, profileBootstrapHintsFromCookies(jar));

  const nextPath = optionalNextPath(formData.get('next'));
  if (nextPath) {
    redirect(nextPath);
  }
  redirect(await resolveSignedInLandingPath(supabase, locale as AppLocale));
}

export async function signOutAction(formData: FormData): Promise<void> {
  const locale = await authLocale();
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect(safeNextPath(formData.get('returnTo'), `/${locale}/auth/sign-in`));
}
