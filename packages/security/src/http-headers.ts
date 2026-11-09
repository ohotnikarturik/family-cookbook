export type SecurityHeaderOptions = {
  /** App origin without trailing slash, e.g. https://app.example.com */
  appOrigin: string;
  /** Supabase project URL for connect-src / img-src allowances */
  supabaseOrigin?: string | undefined;
  isProduction: boolean;
};

function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, '');
}

function originOf(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return url;
  }
}

export function buildContentSecurityPolicy(options: SecurityHeaderOptions): string {
  const self = "'self'";
  const connectSources = [self];
  const imgSources = [self, 'blob:', 'data:'];
  const scriptSources = [self, "'unsafe-inline'"];
  if (options.supabaseOrigin) {
    const origin = originOf(options.supabaseOrigin);
    connectSources.push(origin);
    imgSources.push(origin);
  }

  if (!options.isProduction) {
    // React/Next refresh use eval() in development; HMR uses websockets.
    scriptSources.push("'unsafe-eval'");
    connectSources.push('ws:', 'wss:');
  }

  const directives = [
    `default-src ${self}`,
    `base-uri ${self}`,
    `form-action ${self}`,
    `frame-ancestors 'none'`,
    `object-src 'none'`,
    `script-src ${scriptSources.join(' ')}`,
    `style-src ${self} 'unsafe-inline'`,
    `font-src ${self} data:`,
    `img-src ${imgSources.join(' ')}`,
    `connect-src ${connectSources.join(' ')}`,
  ];

  if (options.isProduction) {
    directives.push('upgrade-insecure-requests');
  }

  return directives.join('; ');
}

export function buildSecurityHeaders(options: SecurityHeaderOptions): Record<string, string> {
  const headers: Record<string, string> = {
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'DENY',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy': buildContentSecurityPolicy(options),
  };

  if (options.isProduction) {
    headers['Strict-Transport-Security'] = 'max-age=63072000; includeSubDomains; preload';
  }

  headers['Cross-Origin-Resource-Policy'] = 'same-origin';
  headers['Cross-Origin-Opener-Policy'] = 'same-origin';

  return headers;
}

export function applySecurityHeadersToHeaders(
  target: Headers,
  options: SecurityHeaderOptions,
): void {
  const built = buildSecurityHeaders({
    ...options,
    appOrigin: stripTrailingSlash(options.appOrigin),
  });
  for (const [key, value] of Object.entries(built)) {
    target.set(key, value);
  }
}
