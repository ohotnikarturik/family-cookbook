import type { InvitationEmailSender } from './email-sender.js';
import { createMailpitInvitationEmailSender } from './mailpit-smtp-sender.js';

export function resolveInvitationEmailSender(): InvitationEmailSender {
  const host = process.env['INVITATION_SMTP_HOST'];
  const portRaw = process.env['INVITATION_SMTP_PORT'];
  const from =
    process.env['INVITATION_SMTP_FROM'] ?? 'Family Cookbook <invites@family-cookbook.test>';

  if (!host || !portRaw) {
    return {
      async sendInvite() {
        return { ok: false, error: 'smtp_not_configured' };
      },
    };
  }

  const port = Number.parseInt(portRaw, 10);
  if (!Number.isFinite(port) || port <= 0) {
    return {
      async sendInvite() {
        return { ok: false, error: 'smtp_not_configured' };
      },
    };
  }

  return createMailpitInvitationEmailSender({ host, port, from });
}
