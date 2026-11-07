import type { InvitationEmailContent } from './build-invitation-email.js';

export type { InvitationEmailContent };

export type InvitationEmailPayload = InvitationEmailContent & {
  to: string;
};

export type InvitationEmailSender = {
  sendInvite(payload: InvitationEmailPayload): Promise<{ ok: true } | { ok: false; error: string }>;
};
