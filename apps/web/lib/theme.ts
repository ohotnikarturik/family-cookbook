/** Cookie storing UI theme preference until profiles.theme_preference exists (T0.4). */
export const THEME_COOKIE = 'fc-theme';

export type ThemePreference = 'system' | 'light' | 'dark';

export function parseThemePreference(value: string | undefined): ThemePreference {
  if (value === 'light' || value === 'dark' || value === 'system') {
    return value;
  }
  return 'system';
}
