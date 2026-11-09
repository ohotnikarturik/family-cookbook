import { afterEach, describe, expect, it, vi } from 'vitest';

import { resolveInvitationEmailSender } from './resolve-email-sender.js';

describe('resolveInvitationEmailSender', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns a failing sender when SMTP is not configured', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('INVITATION_SMTP_HOST', '');
    vi.stubEnv('INVITATION_SMTP_PORT', '');
    const sender = resolveInvitationEmailSender();
    await expect(
      sender.sendInvite({ to: 'a@example.com', subject: 's', text: 't', html: '<p>t</p>' }),
    ).resolves.toEqual({
      ok: false,
      error: 'smtp_not_configured',
    });
  });
});
