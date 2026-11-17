'use client';

import { useActionState, useEffect, useId, useRef, useState } from 'react';
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

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_MS = 30_000;
const wrapLabelClassName = 'h-auto whitespace-normal py-2 text-center';

export function SignInForm({ locale, nextPath, callbackError = false }: Props) {
  const t = useTranslations('auth');

  // Send and resend share one action; a successful send (re)starts the resend countdown.
  const [cooldownEndsAt, setCooldownEndsAt] = useState(0);
  const [now, setNow] = useState(0);
  const [resent, setResent] = useState(false);
  const requestWithCooldown = async (
    prev: MagicLinkState,
    formData: FormData,
    isResend: boolean,
  ) => {
    const result = await requestMagicLinkAction(prev, formData);
    if (result?.ok === true) {
      const start = Date.now();
      setNow(start);
      setCooldownEndsAt(start + RESEND_COOLDOWN_MS);
      setResent(isResend);
    }
    return result;
  };
  const [sendState, sendAction, sendPending] = useActionState<MagicLinkState, FormData>(
    (prev, formData) => requestWithCooldown(prev, formData, false),
    null,
  );
  const [resendState, resendAction, resendPending] = useActionState<MagicLinkState, FormData>(
    (prev, formData) => requestWithCooldown(prev, formData, true),
    null,
  );
  const [otpState, otpAction, otpPending] = useActionState<VerifyOtpState, FormData>(
    verifyEmailOtpAction,
    null,
  );

  // "Use a different email" remembers which send result it dismissed; a new send is a new object.
  const [dismissed, setDismissed] = useState<MagicLinkState>(null);
  const sentTo = sendState?.ok === true && sendState !== dismissed ? sendState.email : null;

  const emailId = useId();
  const codeId = useId();
  const codeHelpId = useId();
  const emailRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (sentTo !== null) {
      codeRef.current?.focus();
    } else if (dismissed !== null) {
      emailRef.current?.focus();
    }
  }, [sentTo, dismissed]);

  useEffect(() => {
    if (otpState?.ok === false) {
      codeRef.current?.focus();
    }
  }, [otpState]);

  const counting = cooldownEndsAt > now;
  useEffect(() => {
    if (!counting) {
      return;
    }
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [counting]);
  const secondsLeft = Math.max(0, Math.ceil((cooldownEndsAt - now) / 1000));

  return (
    <div className="space-y-6">
      {callbackError ? (
        <p className="text-sm text-destructive" role="alert">
          {t('errors.callback')}
        </p>
      ) : null}

      {sentTo === null ? (
        <form
          action={sendAction}
          className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm"
        >
          <input type="hidden" name="next" value={nextPath} />
          <div className="space-y-2">
            <Label htmlFor={emailId}>{t('emailLabel')}</Label>
            <Input
              id={emailId}
              ref={emailRef}
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              disabled={sendPending}
              defaultValue={dismissed?.ok === true ? dismissed.email : ''}
              aria-invalid={sendState?.ok === false}
              aria-describedby={sendState?.ok === false ? `${emailId}-error` : undefined}
            />
            {sendState?.ok === false ? (
              <p id={`${emailId}-error`} className="text-sm text-destructive" role="alert">
                {sendState.error}
              </p>
            ) : null}
          </div>
          <Button type="submit" disabled={sendPending} className={wrapLabelClassName}>
            {sendPending ? t('sending') : t('sendCode')}
          </Button>
        </form>
      ) : (
        <section
          aria-labelledby={`${codeId}-heading`}
          className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm"
        >
          <h2 id={`${codeId}-heading`} className="text-lg font-semibold text-foreground">
            {t('checkEmailTitle')}
          </h2>
          <p className="break-words text-sm text-muted-foreground" role="status">
            {resent ? t('resent', { email: sentTo }) : t('sentTo', { email: sentTo })}
          </p>

          <form action={otpAction} className="space-y-4">
            <input type="hidden" name="next" value={nextPath} />
            <input type="hidden" name="email" value={sentTo} />
            <div className="space-y-2">
              <Label htmlFor={codeId}>{t('codeLabel')}</Label>
              <Input
                id={codeId}
                ref={codeRef}
                name="token"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                required
                disabled={otpPending}
                aria-invalid={otpState?.ok === false}
                aria-describedby={
                  otpState?.ok === false ? `${codeHelpId} ${codeId}-error` : codeHelpId
                }
                className="h-14 text-center font-mono text-2xl tracking-widest"
                onChange={(event) => {
                  // Keep digits only (paste such as "123 456" works) and submit on the sixth.
                  const input = event.currentTarget;
                  const digits = input.value.replace(/\D/g, '').slice(0, CODE_LENGTH);
                  input.value = digits;
                  if (digits.length === CODE_LENGTH) {
                    input.form?.requestSubmit();
                  }
                }}
              />
              <p id={codeHelpId} className="text-sm text-muted-foreground">
                {t('codeHint')}
              </p>
              {otpState?.ok === false ? (
                <p id={`${codeId}-error`} className="text-sm text-destructive" role="alert">
                  {otpState.error}
                </p>
              ) : null}
            </div>
            <Button type="submit" disabled={otpPending} className={wrapLabelClassName}>
              {otpPending ? t('verifying') : t('verifyCode')}
            </Button>
          </form>

          <p className="text-sm text-muted-foreground">{t('orOpenLink')}</p>

          <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:flex-wrap">
            <form action={resendAction}>
              <input type="hidden" name="next" value={nextPath} />
              <input type="hidden" name="email" value={sentTo} />
              <Button
                type="submit"
                variant="outline"
                disabled={resendPending || counting}
                className={`${wrapLabelClassName} w-full sm:w-auto`}
              >
                {counting ? t('resendIn', { seconds: secondsLeft }) : t('resend')}
              </Button>
            </form>
            <Button
              type="button"
              variant="quiet"
              className={`${wrapLabelClassName} sm:w-auto`}
              onClick={() => setDismissed(sendState)}
            >
              {t('useDifferentEmail')}
            </Button>
          </div>
          {resendState?.ok === false ? (
            <p className="text-sm text-destructive" role="alert">
              {resendState.error}
            </p>
          ) : null}
        </section>
      )}

      <p className="text-center text-sm text-muted-foreground">
        <a href={`/${locale}`} className={textLinkClassName}>
          {t('backHome')}
        </a>
      </p>
    </div>
  );
}
