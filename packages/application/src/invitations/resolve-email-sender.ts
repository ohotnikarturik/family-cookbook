import type { InvitationEmailSender } from './email-sender.js';
import { createMailpitInvitationEmailSender } from './mailpit-smtp-sender.js';
import { parseInvitationSmtpConfigFromEnv } from './invitation-smtp-config.js';

function stubSender(error: string): InvitationEmailSender {
  return {
    async sendInvite() {
      return { ok: false, error };
    },
  };
}

export function resolveInvitationEmailSender(): InvitationEmailSender {
  const parsed = parseInvitationSmtpConfigFromEnv();
  if (!parsed.ok) {
    return stubSender(parsed.code);
  }

  return createMailpitInvitationEmailSender(parsed.config);
}
