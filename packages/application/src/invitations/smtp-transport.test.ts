import { describe, expect, it } from 'vitest';

import { invitationSmtpTransportOptions } from './mailpit-smtp-sender.js';

describe('invitationSmtpTransportOptions', () => {
  it('skips certificate checks only for the local Mailpit host', () => {
    expect(invitationSmtpTransportOptions('127.0.0.1', 54325)).toEqual({
      host: '127.0.0.1',
      port: 54325,
      secure: false,
      connectionTimeout: 15_000,
      greetingTimeout: 15_000,
      tls: { rejectUnauthorized: false },
    });
  });

  it('verifies certificates for any other SMTP host', () => {
    expect(invitationSmtpTransportOptions('smtp.example.com', 587)).toEqual({
      host: 'smtp.example.com',
      port: 587,
      secure: false,
      connectionTimeout: 15_000,
      greetingTimeout: 15_000,
    });
    expect(invitationSmtpTransportOptions('smtp.example.com', 465).secure).toBe(true);
  });

  it('includes SMTP auth when provided', () => {
    expect(
      invitationSmtpTransportOptions('smtp.example.com', 587, {
        user: 'apikey',
        pass: 'secret',
      }),
    ).toMatchObject({
      auth: { user: 'apikey', pass: 'secret' },
    });
  });
});
