import nodemailer from 'nodemailer';

import type { InvitationEmailPayload, InvitationEmailSender } from './email-sender.js';

export type MailpitSmtpConfig = {
  host: string;
  port: number;
  from: string;
};

export type InvitationSmtpTransportOptions = {
  host: string;
  port: number;
  secure: boolean;
  tls?: { rejectUnauthorized: false };
};

export function invitationSmtpTransportOptions(
  host: string,
  port: number,
): InvitationSmtpTransportOptions {
  const normalized = host.trim().toLowerCase();
  const local = normalized === 'localhost' || normalized === '127.0.0.1' || normalized === '::1';
  if (!local) {
    return {
      host,
      port,
      secure: port === 465,
    };
  }
  return {
    host,
    port,
    secure: false,
    tls: { rejectUnauthorized: false },
  };
}

export function createMailpitInvitationEmailSender(
  config: MailpitSmtpConfig,
): InvitationEmailSender {
  const transport = nodemailer.createTransport(
    invitationSmtpTransportOptions(config.host, config.port),
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
        return { ok: false, error: 'smtp_send_failed' };
      }
    },
  };
}
