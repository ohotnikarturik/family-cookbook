'use server';

import { sampleDisplayNameSchema } from '@family-cookbook/contracts';
import { cookies } from 'next/headers';
import { getTranslations } from 'next-intl/server';

import { LOCALE_COOKIE, parseAppLocale } from '@/lib/locale';

export type SampleProfileState = null | { ok: true } | { ok: false; error: string };

export async function submitSampleDisplayNameAction(
  _prevState: SampleProfileState | null,
  formData: FormData,
): Promise<SampleProfileState> {
  const jar = await cookies();
  const locale = parseAppLocale(jar.get(LOCALE_COOKIE)?.value);
  const tValidation = await getTranslations({ locale, namespace: 'validation' });

  const raw = formData.get('displayName');
  const displayName = typeof raw === 'string' ? raw : '';

  const parsed = sampleDisplayNameSchema.safeParse({ displayName });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    if (issue && issue.code === 'too_small' && issue.origin === 'string') {
      return { ok: false, error: tValidation('tooShort') };
    }
    if (issue && issue.code === 'too_big' && issue.origin === 'string') {
      return { ok: false, error: tValidation('tooLong') };
    }
    return { ok: false, error: tValidation('invalid') };
  }

  return { ok: true };
}
