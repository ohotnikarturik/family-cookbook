import { describe, expect, it } from 'vitest';

import { createMcpApp } from './app.js';
import { localAppRequest } from './test/request.js';

describe('GET /health', () => {
  it('returns ok', async () => {
    const app = createMcpApp({ enableOAuth: false });
    const res = await app.fetch(localAppRequest('/health'));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ status: 'ok' });
  });
});
