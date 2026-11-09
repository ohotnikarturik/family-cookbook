import { describe, expect, it } from 'vitest';

import { localeSwitchTargetPath } from '@/lib/locale-switch-path';

describe('localeSwitchTargetPath', () => {
  it('returns pathname when there is no query string', () => {
    expect(
      localeSwitchTargetPath('/invite/accept', {
        toString: () => '',
      }),
    ).toBe('/invite/accept');
  });

  it('preserves query parameters such as invitation tokens', () => {
    expect(
      localeSwitchTargetPath('/invite/accept', {
        toString: () => 'token=abc123',
      }),
    ).toBe('/invite/accept?token=abc123');
  });
});
