import { describe, expect, it, vi } from 'vitest';

import { LOCALE_COOKIE } from '@/lib/locale';
import { THEME_COOKIE } from '@/lib/theme';

import { writeProfilePreferenceCookies } from './profile-preference-cookies';

describe('writeProfilePreferenceCookies', () => {
  it('sets locale and theme cookies', () => {
    const set = vi.fn();
    writeProfilePreferenceCookies({ set }, { preferredLanguage: 'fi', themePreference: 'dark' });

    expect(set).toHaveBeenCalledWith(
      LOCALE_COOKIE,
      'fi',
      expect.objectContaining({ path: '/', httpOnly: false }),
    );
    expect(set).toHaveBeenCalledWith(
      THEME_COOKIE,
      'dark',
      expect.objectContaining({ path: '/', httpOnly: false }),
    );
  });
});
