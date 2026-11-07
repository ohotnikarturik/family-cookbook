import { describe, expect, it } from 'vitest';

import { hashInvitationToken } from './hash-token.js';

describe('hashInvitationToken', () => {
  it('matches encode(digest(token, sha256), hex) for a known token', () => {
    const token = 'redeem-test-token-32chars-min!!';
    expect(hashInvitationToken(token)).toBe(
      '1b55d638fe9c35c0c5c6c5f90a93139fdc104b2ee6113150325840f1274ceeea',
    );
    expect(hashInvitationToken(`  ${token}  `)).toBe(
      '1b55d638fe9c35c0c5c6c5f90a93139fdc104b2ee6113150325840f1274ceeea',
    );
  });
});
