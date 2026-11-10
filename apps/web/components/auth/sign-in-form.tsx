'use client';

import { useActionState, useId } from 'react';
import { useTranslations } from 'next-intl';

import {
  requestMagicLinkAction,
  verifyEmailOtpAction,
  type MagicLinkState,
  type VerifyOtpState,
} from '@/app/actions/auth';
import { textLinkClassName } from '@/components/product/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Props = Readonly<{
  locale: string;
  nextPath: string;
  callbackError?: boolean;
}>;

export function SignInForm({ locale, nextPath, callbackError = false }: Props) {
  const t = useTranslations('auth');
  const [magicState, magicAction, magicPending] = useActionState<MagicLinkState, FormData>(
    requestMagicLinkAction,
    null,
  );
  const [otpState, otpAction, otpPending] = useActionState<VerifyOtpState, FormData>(
    verifyEmailOtpAction,
    null,
  );

  const emailId = useId();
  const otpId = useId();
  const emailForOtp = magicState?.ok === true ? magicState.email : '';

  return (
    <div className="space-y-6">
      {callbackError ? (
        <p className="text-sm text-destructive" role="alert">
          {t('errors.callback')}
        </p>
      ) : null}

      {magicState?.ok === true ? (
        <p className="text-sm text-muted-foreground" role="status">
          {t('emailSent', { email: magicState.email })}
        </p>
      ) : null}

      <form
        action={magicAction}
        className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm"
      >
        <input type="hidden" name="next" value={nextPath} />
        <div className="space-y-2">
          <Label htmlFor={emailId}>{t('emailLabel')}</Label>
          <Input
            id={emailId}
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            disabled={magicPending}
            defaultValue={emailForOtp}
            aria-invalid={magicState?.ok === false}
          />
          {magicState?.ok === false ? (
            <p className="text-sm text-destructive" role="alert">
              {magicState.error}
            </p>
          ) : null}
        </div>
        <Button type="submit" disabled={magicPending}>
          {magicPending ? t('sending') : t('sendMagicLink')}
        </Button>
      </form>

      <form
        action={otpAction}
        className="space-y-4 rounded-xl border border-border bg-muted/20 p-5"
        aria-labelledby="otp-heading"
      >
        <h2 id="otp-heading" className="text-base font-semibold text-foreground">
          {t('otpHeading')}
        </h2>
        <p className="text-sm text-muted-foreground">{t('otpHint')}</p>
        <input type="hidden" name="next" value={nextPath} />
        <input type="hidden" name="email" value={emailForOtp} />
        <div className="space-y-2">
          <Label htmlFor={otpId}>{t('otpLabel')}</Label>
          <Input
            id={otpId}
            name="token"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            minLength={6}
            maxLength={6}
            disabled={otpPending || emailForOtp.length === 0}
            aria-invalid={otpState?.ok === false}
          />
          {otpState?.ok === false ? (
            <p className="text-sm text-destructive" role="alert">
              {otpState.error}
            </p>
          ) : null}
          {emailForOtp.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('otpNeedsEmail')}</p>
          ) : null}
        </div>
        <Button type="submit" variant="secondary" disabled={otpPending || emailForOtp.length === 0}>
          {otpPending ? t('verifying') : t('verifyOtp')}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        <a href={`/${locale}`} className={textLinkClassName}>
          {t('backHome')}
        </a>
      </p>
    </div>
  );
}
