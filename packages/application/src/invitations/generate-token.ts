import { randomBytes } from 'node:crypto';

import { INVITATION_TOKEN_MIN_LENGTH } from '@family-cookbook/contracts';

export function generateInvitationToken(): string {
  const token = randomBytes(32).toString('base64url');
  if (token.length < INVITATION_TOKEN_MIN_LENGTH) {
    return token.padEnd(INVITATION_TOKEN_MIN_LENGTH, 'a');
  }
  return token;
}
