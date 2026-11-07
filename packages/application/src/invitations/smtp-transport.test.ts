import { describe, expect, it } from 'vitest';

import { invitationSmtpTransportOptions } from './mailpit-smtp-sender.js';

describe('invitationSmtpTransportOptions', () => {
  it('skips certificate checks only for the local Mailpit host', () => {
    expect(invitationSmtpTransportOptions('127.0.0.1', 54325)).toEqual({
      host: '127.0.0.1',
      port: 54325,
      secure: false,
      tls: { rejectUnauthorized: false },
    });
  });

  it('verifies certificates for any other SMTP host', () => {
    expect(invitationSmtpTransportOptions('smtp.example.com', 587)).toEqual({
      host: 'smtp.example.com',
      port: 587,
      secure: false,
    });
    expect(invitationSmtpTransportOptions('smtp.example.com', 465).secure).toBe(true);
  });
});
