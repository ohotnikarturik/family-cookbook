'use server';

import { setFamilyMemberRole, setFamilyMemberStatus } from '@family-cookbook/application';
import {
  familyIdSchema,
  familyRoleSchema,
  membershipStatusSchema,
} from '@family-cookbook/contracts';
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

function membersPath(locale: string, familyId: string): string {
  return `/${locale}/f/${familyId}/settings/members`;
}

export type FamilyMemberAdminActionState = null | {
  ok: false;
  message: string;
};

export async function setFamilyMemberRoleAction(
  _prev: FamilyMemberAdminActionState | null,
  formData: FormData,
): Promise<FamilyMemberAdminActionState> {
  const locale = await actionLocale();
  const t = await getTranslations({ locale, namespace: 'family.members.admin' });

  const familyParsed = familyIdSchema.safeParse(formData.get('familyId'));
  const memberUserId =
    typeof formData.get('memberUserId') === 'string' ? formData.get('memberUserId') : '';
  const roleParsed = familyRoleSchema.safeParse(formData.get('newRole'));

  if (!familyParsed.success || typeof memberUserId !== 'string' || !roleParsed.success) {
    return { ok: false, message: t('errors.validation') };
  }

  const supabase = await createServerSupabaseClient();
  const result = await setFamilyMemberRole(supabase, {
    familyId: familyParsed.data,
    memberUserId,
    newRole: roleParsed.data,
  });

  if (result.status === 'auth_required') {
    redirect(`/${locale}/auth/sign-in?next=${membersPath(locale, familyParsed.data)}`);
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

  revalidatePath(membersPath(locale, familyParsed.data));
  return null;
}

export async function setFamilyMemberStatusAction(
  _prev: FamilyMemberAdminActionState | null,
  formData: FormData,
): Promise<FamilyMemberAdminActionState> {
  const locale = await actionLocale();
  const t = await getTranslations({ locale, namespace: 'family.members.admin' });

  const familyParsed = familyIdSchema.safeParse(formData.get('familyId'));
  const memberUserId =
    typeof formData.get('memberUserId') === 'string' ? formData.get('memberUserId') : '';
  const statusParsed = membershipStatusSchema.safeParse(formData.get('newStatus'));

  if (!familyParsed.success || typeof memberUserId !== 'string' || !statusParsed.success) {
    return { ok: false, message: t('errors.validation') };
  }

  const supabase = await createServerSupabaseClient();
  const result = await setFamilyMemberStatus(supabase, {
    familyId: familyParsed.data,
    memberUserId,
    newStatus: statusParsed.data,
  });

  if (result.status === 'auth_required') {
    redirect(`/${locale}/auth/sign-in?next=${membersPath(locale, familyParsed.data)}`);
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

  revalidatePath(membersPath(locale, familyParsed.data));
  return null;
}
