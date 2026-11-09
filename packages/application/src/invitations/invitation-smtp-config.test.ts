import { describe, expect, it } from 'vitest';

import { parseInvitationSmtpConfigFromEnv } from './invitation-smtp-config.js';

describe('parseInvitationSmtpConfigFromEnv', () => {
  it('returns not_configured when host or port is missing', () => {
    expect(parseInvitationSmtpConfigFromEnv({ NODE_ENV: 'development' })).toEqual({
      ok: false,
      code: 'smtp_not_configured',
    });
    expect(
      parseInvitationSmtpConfigFromEnv({
        NODE_ENV: 'development',
        INVITATION_SMTP_HOST: '127.0.0.1',
      }),
    ).toEqual({ ok: false, code: 'smtp_not_configured' });
  });

  it('allows local Mailpit defaults in development', () => {
    const result = parseInvitationSmtpConfigFromEnv({
      NODE_ENV: 'development',
      INVITATION_SMTP_HOST: '127.0.0.1',
      INVITATION_SMTP_PORT: '54325',
    });
    expect(result).toMatchObject({
      ok: true,
      config: {
        host: '127.0.0.1',
        port: 54325,
        from: 'Family Cookbook <invites@family-cookbook.test>',
      },
    });
  });

  it('rejects loopback and missing auth in production', () => {
    expect(
      parseInvitationSmtpConfigFromEnv({
        NODE_ENV: 'production',
        INVITATION_SMTP_HOST: '127.0.0.1',
        INVITATION_SMTP_PORT: '587',
        INVITATION_SMTP_FROM: 'Family Cookbook <invites@example.com>',
        INVITATION_SMTP_USER: 'apikey',
        INVITATION_SMTP_PASSWORD: 'secret',
      }),
    ).toEqual({ ok: false, code: 'smtp_production_unsafe' });

    expect(
      parseInvitationSmtpConfigFromEnv({
        NODE_ENV: 'production',
        INVITATION_SMTP_HOST: 'smtp.example.com',
        INVITATION_SMTP_PORT: '587',
        INVITATION_SMTP_FROM: 'Family Cookbook <invites@family-cookbook.test>',
        INVITATION_SMTP_USER: 'apikey',
        INVITATION_SMTP_PASSWORD: 'secret',
      }),
    ).toEqual({ ok: false, code: 'smtp_production_unsafe' });

    expect(
      parseInvitationSmtpConfigFromEnv({
        NODE_ENV: 'production',
        INVITATION_SMTP_HOST: 'smtp.example.com',
        INVITATION_SMTP_PORT: '587',
        INVITATION_SMTP_FROM: 'Family Cookbook <invites@example.com>',
      }),
    ).toEqual({ ok: false, code: 'smtp_invalid_config' });
  });

  it('accepts authenticated remote SMTP in production', () => {
    const result = parseInvitationSmtpConfigFromEnv({
      NODE_ENV: 'production',
      INVITATION_SMTP_HOST: 'smtp.example.com',
      INVITATION_SMTP_PORT: '587',
      INVITATION_SMTP_FROM: 'Family Cookbook <invites@example.com>',
      INVITATION_SMTP_USER: 'smtp-user',
      INVITATION_SMTP_PASSWORD: 'smtp-pass',
    });
    expect(result).toEqual({
      ok: true,
      config: {
        host: 'smtp.example.com',
        port: 587,
        from: 'Family Cookbook <invites@example.com>',
        auth: { user: 'smtp-user', pass: 'smtp-pass' },
      },
    });
  });
});
