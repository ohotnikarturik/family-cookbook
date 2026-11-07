import { describe, expect, it } from 'vitest';

import { isPendingInvitationExpired } from './invitation.js';

describe('isPendingInvitationExpired', () => {
  const now = new Date('2026-11-07T12:00:00.000Z');

  it('treats the expiry instant as expired', () => {
    expect(isPendingInvitationExpired('2026-11-07T12:00:00.000Z', now)).toBe(true);
    expect(isPendingInvitationExpired('2026-11-07T11:59:00.000Z', now)).toBe(true);
  });

  it('keeps a future invite', () => {
    expect(isPendingInvitationExpired('2026-11-08T12:00:00.000Z', now)).toBe(false);
  });

  it('does not treat an unreadable timestamp as expired', () => {
    expect(isPendingInvitationExpired('not-a-date', now)).toBe(false);
  });
});
