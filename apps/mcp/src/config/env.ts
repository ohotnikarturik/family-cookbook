import { z } from 'zod';

const publicUrlSchema = z.url();

export function getMcpPort(): number {
  const raw = process.env['MCP_PORT'] ?? '8787';
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('Invalid MCP_PORT');
  }
  return port;
}

export function getMcpPublicUrl(): string {
  const raw = process.env['MCP_PUBLIC_URL'] ?? `http://127.0.0.1:${getMcpPort()}`;
  const parsed = publicUrlSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error('Invalid MCP_PUBLIC_URL');
  }
  return parsed.data.replace(/\/$/, '');
}

function parseCsvEnv(name: string): string[] | undefined {
  const raw = process.env[name]?.trim();
  if (!raw) {
    return undefined;
  }
  const parts = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : undefined;
}

export function getMcpHonoAppOptions(): {
  host: string;
  allowedHosts?: string[];
  allowedOrigins?: string[];
} {
  const publicUrl = new URL(getMcpPublicUrl());
  const isLoopback =
    publicUrl.hostname === 'localhost' ||
    publicUrl.hostname === '127.0.0.1' ||
    publicUrl.hostname === '[::1]';

  const allowedHosts = parseCsvEnv('MCP_ALLOWED_HOSTS');
  const allowedOrigins = parseCsvEnv('MCP_ALLOWED_ORIGINS');

  if (isLoopback) {
    const out: { host: string; allowedHosts?: string[]; allowedOrigins?: string[] } = {
      host: '127.0.0.1',
    };
    if (allowedHosts) {
      out.allowedHosts = allowedHosts;
    }
    if (allowedOrigins) {
      out.allowedOrigins = allowedOrigins;
    }
    return out;
  }

  const out: { host: string; allowedHosts?: string[]; allowedOrigins?: string[] } = {
    host: '0.0.0.0',
    allowedHosts: allowedHosts ?? [publicUrl.host],
  };
  if (allowedOrigins) {
    out.allowedOrigins = allowedOrigins;
  }
  return out;
}
