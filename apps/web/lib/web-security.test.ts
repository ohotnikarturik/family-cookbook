import { describe, expect, it } from 'vitest';

import { allowedCorsOrigins, jsonWithCors } from './web-security';

describe('allowedCorsOrigins', () => {
  it('includes local dev origins outside production', () => {
    const origins = allowedCorsOrigins();
    expect(origins.some((o) => o.includes('localhost'))).toBe(true);
  });
});

describe('jsonWithCors', () => {
  it('returns an empty 204 without throwing', async () => {
    const request = new Request('http://localhost:3003/api/uploads', {
      method: 'OPTIONS',
      headers: { origin: 'http://localhost:3003' },
    });
    const response = jsonWithCors(request, null, { status: 204 });
    expect(response.status).toBe(204);
    expect(await response.text()).toBe('');
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3003');
  });
});
