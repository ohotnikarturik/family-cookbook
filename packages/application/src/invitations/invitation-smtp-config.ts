import { isLocalInvitationSmtpHost } from './invitation-smtp-host.js';

export type InvitationSmtpAuth = {
  user: string;
  pass: string;
};

export type InvitationSmtpConfig = {
  host: string;
  port: number;
  from: string;
  auth?: InvitationSmtpAuth;
};

export type InvitationSmtpConfigErrorCode =
  | 'smtp_not_configured'
  | 'smtp_invalid_config'
  | 'smtp_production_unsafe';

export type ParseInvitationSmtpConfigResult =
  | { ok: true; config: InvitationSmtpConfig }
  | { ok: false; code: InvitationSmtpConfigErrorCode };

const LOCAL_DEFAULT_FROM = 'Family Cookbook <invites@family-cookbook.test>';

function readTrimmed(env: NodeJS.ProcessEnv, key: string): string | undefined {
  const raw = env[key];
  if (typeof raw !== 'string') {
    return undefined;
  }
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function parseInvitationSmtpConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): ParseInvitationSmtpConfigResult {
  const host = readTrimmed(env, 'INVITATION_SMTP_HOST');
  const portRaw = readTrimmed(env, 'INVITATION_SMTP_PORT');
  const from = readTrimmed(env, 'INVITATION_SMTP_FROM');
  const user = readTrimmed(env, 'INVITATION_SMTP_USER');
  const pass = readTrimmed(env, 'INVITATION_SMTP_PASSWORD');

  if (!host || !portRaw) {
    return { ok: false, code: 'smtp_not_configured' };
  }

  const port = Number.parseInt(portRaw, 10);
  if (!Number.isFinite(port) || port <= 0 || port > 65_535) {
    return { ok: false, code: 'smtp_invalid_config' };
  }

  const production = env.NODE_ENV === 'production';
  const localHost = isLocalInvitationSmtpHost(host);

  if (production) {
    if (localHost) {
      return { ok: false, code: 'smtp_production_unsafe' };
    }
    if (!from) {
      return { ok: false, code: 'smtp_invalid_config' };
    }
    if (!user || !pass) {
      return { ok: false, code: 'smtp_invalid_config' };
    }
    if (from.includes('@family-cookbook.test')) {
      return { ok: false, code: 'smtp_production_unsafe' };
    }
  }

  const config: InvitationSmtpConfig = {
    host,
    port,
    from: from ?? LOCAL_DEFAULT_FROM,
  };

  if (user && pass) {
    config.auth = { user, pass };
  }

  return { ok: true, config };
}
