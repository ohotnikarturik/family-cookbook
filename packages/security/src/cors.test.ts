import { describe, expect, it } from 'vitest';

import { corsHeadersForAllowedOrigin, evaluateCorsRequest } from './cors.js';

describe('evaluateCorsRequest', () => {
  it('rejects unknown origins', () => {
    expect(evaluateCorsRequest('https://evil.example', ['https://app.example.com'])).toEqual({
      allowed: false,
      reason: 'origin_mismatch',
    });
  });

  it('allows a configured origin', () => {
    expect(evaluateCorsRequest('https://app.example.com/', ['https://app.example.com'])).toEqual({
      allowed: true,
      origin: 'https://app.example.com/',
    });
    expect(corsHeadersForAllowedOrigin('https://app.example.com')).toMatchObject({
      'Access-Control-Allow-Origin': 'https://app.example.com',
      'Access-Control-Allow-Credentials': 'true',
    });
  });
});
