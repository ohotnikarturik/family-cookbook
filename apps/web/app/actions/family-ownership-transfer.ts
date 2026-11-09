'use server';

import { transferFamilyOwnership } from '@family-cookbook/application';
import {
  familyIdSchema,
  formerOwnerRoleSchema,
  transferFamilyOwnershipInputSchema,
  type FormerOwnerRole,
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

export type FamilyOwnershipTransferActionState = null | {
  ok: false;
  message: string;
};

function parseConfirm(value: FormDataEntryValue | null): boolean {
  return value === 'true' || value === '1';
}

export async function transferFamilyOwnershipAction(
  _prev: FamilyOwnershipTransferActionState | null,
  formData: FormData,
): Promise<FamilyOwnershipTransferActionState> {
  const locale = await actionLocale();
  const t = await getTranslations({ locale, namespace: 'family.members.transfer' });

  const familyParsed = familyIdSchema.safeParse(formData.get('familyId'));
  const newOwnerRaw = formData.get('newOwnerUserId');
  const newOwnerUserId = typeof newOwnerRaw === 'string' ? newOwnerRaw : '';
  const formerRoleRaw = formData.get('formerOwnerRole');
  let formerOwnerRole: FormerOwnerRole | undefined;

  if (typeof formerRoleRaw === 'string' && formerRoleRaw !== '') {
    const formerOwnerRoleParsed = formerOwnerRoleSchema.safeParse(formerRoleRaw);
    if (!formerOwnerRoleParsed.success) {
      return { ok: false, message: t('errors.validation') };
    }
    formerOwnerRole = formerOwnerRoleParsed.data;
  }

  const confirm = parseConfirm(formData.get('confirm'));
  const input = {
    ...(familyParsed.success ? { familyId: familyParsed.data } : {}),
    ...(newOwnerUserId !== '' ? { newOwnerUserId } : {}),
    confirm: confirm ? (true as const) : (false as const),
    ...(formerOwnerRole ? { formerOwnerRole } : {}),
  };

  const parsed = transferFamilyOwnershipInputSchema.safeParse(input);
  if (!familyParsed.success || !parsed.success) {
    return { ok: false, message: t('errors.validation') };
  }

  const supabase = await createServerSupabaseClient();
  const result = await transferFamilyOwnership(supabase, parsed.data);

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
  revalidatePath(`/${locale}/f/${familyParsed.data}`);
  return null;
}
