import nodemailer from 'nodemailer';

import type { InvitationEmailPayload, InvitationEmailSender } from './email-sender.js';
import type { InvitationSmtpAuth, InvitationSmtpConfig } from './invitation-smtp-config.js';
import { isLocalInvitationSmtpHost } from './invitation-smtp-host.js';

export type MailpitSmtpConfig = InvitationSmtpConfig;

export type InvitationSmtpTransportOptions = {
  host: string;
  port: number;
  secure: boolean;
  connectionTimeout: number;
  greetingTimeout: number;
  auth?: InvitationSmtpAuth;
  tls?: { rejectUnauthorized: false };
};

const SMTP_TIMEOUT_MS = 15_000;

export function invitationSmtpTransportOptions(
  host: string,
  port: number,
  auth?: InvitationSmtpAuth,
): InvitationSmtpTransportOptions {
  const local = isLocalInvitationSmtpHost(host);
  const base: InvitationSmtpTransportOptions = {
    host,
    port,
    secure: port === 465,
    connectionTimeout: SMTP_TIMEOUT_MS,
    greetingTimeout: SMTP_TIMEOUT_MS,
    ...(auth ? { auth } : {}),
  };
  if (!local) {
    return base;
  }
  return {
    ...base,
    secure: false,
    tls: { rejectUnauthorized: false },
  };
}

export function createMailpitInvitationEmailSender(
  config: InvitationSmtpConfig,
): InvitationEmailSender {
  const transport = nodemailer.createTransport(
    invitationSmtpTransportOptions(config.host, config.port, config.auth),
  );

  return {
    async sendInvite(payload: InvitationEmailPayload) {
      try {
        await transport.sendMail({
          from: config.from,
          to: payload.to,
          subject: payload.subject,
          text: payload.text,
          html: payload.html,
        });
        return { ok: true };
      } catch {
        // Do not log transport errors: they may include host credentials or message bodies.
        return { ok: false, error: 'smtp_send_failed' };
      }
    },
  };
}
