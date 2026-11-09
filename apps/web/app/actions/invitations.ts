'use server';

import {
  acceptInvitation,
  buildInvitationEmail,
  createInvitation,
  ensureProfileForCurrentUser,
  resolveInvitationEmailSender,
  revokeInvitation,
} from '@family-cookbook/application';
import {
  familyIdSchema,
  invitationTokenSchema,
  inviteMemberInputSchema,
} from '@family-cookbook/contracts';
import { getAppUrl } from '@family-cookbook/data-access';
import { createServerSupabaseClient } from '@family-cookbook/data-access/supabase/server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';

import { profileBootstrapHintsFromCookies } from '@/lib/auth-hints';
import { LOCALE_COOKIE, parseAppLocale } from '@/lib/locale';

export type CreateInvitationState = null | { ok: true } | { ok: false; error: string };

export type AcceptInvitationState =
  | null
  | { ok: true; familyId: string }
  | { ok: false; error: string };

export type RevokeInvitationState = null | { ok: true } | { ok: false; error: string };

async function actionLocale(): Promise<string> {
  const jar = await cookies();
  return parseAppLocale(jar.get(LOCALE_COOKIE)?.value);
}

function readFormString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value : '';
}

function inviteAcceptUrl(locale: string, rawToken: string): string {
  const base = getAppUrl().replace(/\/$/, '');
  const params = new URLSearchParams({ token: rawToken });
  return `${base}/${locale}/invite/accept?${params.toString()}`;
}

export async function createInvitationAction(
  _prev: CreateInvitationState | null,
  formData: FormData,
): Promise<CreateInvitationState> {
  const locale = await actionLocale();
  const t = await getTranslations({ locale, namespace: 'invitations' });

  const parsed = inviteMemberInputSchema.safeParse({
    familyId: formData.get('familyId'),
    email: formData.get('email'),
    role: formData.get('role'),
  });

  if (!parsed.success) {
    return { ok: false, error: t('errors.validation') };
  }

  const supabase = await createServerSupabaseClient();
  const { data: profile } = await supabase.from('profiles').select('display_name').maybeSingle();
  const inviterDisplayName = profile?.display_name?.trim() || t('email.inviterFallback');

  const result = await createInvitation(supabase, parsed.data, {
    acceptUrlForToken: (token) => inviteAcceptUrl(locale, token),
    emailSender: resolveInvitationEmailSender(),
    renderEmail: ({ to, acceptUrl, familyName }) =>
      buildInvitationEmail({
        subject: t('email.subject', { familyName }),
        intro: t('email.intro', { inviter: inviterDisplayName, familyName }),
        actionLabel: t('email.action'),
        signInWith: t('email.signInWith', { email: to }),
        acceptUrl,
      }),
  });

  if (result.status === 'auth_required') {
    redirect(`/${locale}/auth/sign-in`);
  }
  if (result.status === 'forbidden') {
    return { ok: false, error: t('errors.forbidden') };
  }
  if (result.status === 'duplicate_pending') {
    return { ok: false, error: t('errors.duplicatePending') };
  }
  if (result.status === 'rate_limited') {
    return { ok: false, error: t('errors.rateLimited') };
  }
  if (result.status === 'email_failed' || result.status === 'email_failed_kept') {
    revalidatePath(`/${locale}/f/${parsed.data.familyId}/settings/invitations`);
    return {
      ok: false,
      error: t(
        result.status === 'email_failed_kept' ? 'errors.emailFailedKept' : 'errors.emailFailed',
      ),
    };
  }
  if (result.status !== 'ok') {
    return { ok: false, error: t('errors.createFailed') };
  }

  revalidatePath(`/${locale}/f/${parsed.data.familyId}/settings/invitations`);
  return { ok: true };
}

export async function revokeInvitationAction(
  _prev: RevokeInvitationState | null,
  formData: FormData,
): Promise<RevokeInvitationState> {
  const locale = await actionLocale();
  const t = await getTranslations({ locale, namespace: 'invitations' });
  const familyId = readFormString(formData, 'familyId');
  const invitationId = readFormString(formData, 'invitationId');

  if (
    !familyIdSchema.safeParse(familyId).success ||
    !familyIdSchema.safeParse(invitationId).success
  ) {
    return { ok: false, error: t('errors.revokeFailed') };
  }

  const supabase = await createServerSupabaseClient();
  const result = await revokeInvitation(supabase, familyId, invitationId);
  if (result.status === 'auth_required') {
    redirect(`/${locale}/auth/sign-in?next=/${locale}/f/${familyId}/settings/invitations`);
  }
  if (result.status !== 'ok') {
    return { ok: false, error: t('errors.revokeFailed') };
  }

  revalidatePath(`/${locale}/f/${familyId}/settings/invitations`);
  return { ok: true };
}

export async function acceptInvitationAction(
  _prev: AcceptInvitationState | null,
  formData: FormData,
): Promise<AcceptInvitationState> {
  const locale = await actionLocale();
  const t = await getTranslations({ locale, namespace: 'inviteAccept' });

  const parsed = invitationTokenSchema.safeParse(
    typeof formData.get('token') === 'string' ? formData.get('token') : '',
  );
  if (!parsed.success) {
    return { ok: false, error: t('errors.invalid') };
  }

  const supabase = await createServerSupabaseClient();
  const jar = await cookies();
  await ensureProfileForCurrentUser(supabase, profileBootstrapHintsFromCookies(jar));
  const result = await acceptInvitation(supabase, parsed.data);

  if (result.status === 'auth_required') {
    const next = `/${locale}/invite/accept?token=${encodeURIComponent(parsed.data)}`;
    redirect(`/${locale}/auth/sign-in?next=${encodeURIComponent(next)}`);
  }

  if (result.status === 'email_mismatch') {
    return { ok: false, error: t('errors.emailMismatch') };
  }
  if (result.status === 'email_unverified') {
    return { ok: false, error: t('errors.emailUnverified') };
  }
  if (result.status === 'expired') {
    return { ok: false, error: t('errors.expired') };
  }
  if (result.status === 'revoked' || result.status === 'already_accepted') {
    return { ok: false, error: t('errors.unavailable') };
  }
  if (result.status === 'not_found') {
    return { ok: false, error: t('errors.invalid') };
  }
  if (result.status === 'rate_limited') {
    return { ok: false, error: t('errors.rateLimited') };
  }
  if (result.status !== 'ok') {
    return { ok: false, error: t('errors.generic') };
  }

  redirect(`/${locale}/f/${result.familyId}`);
}
