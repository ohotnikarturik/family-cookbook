'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { setThemePreferenceAction } from '@/app/actions/theme';
import { parseThemePreference, THEME_COOKIE, type ThemePreference } from '@/lib/theme';

type ThemeContextValue = {
  preference: ThemePreference;
  /** False until the cookie has been read. The inline script owns the class until then. */
  ready: boolean;
  setPreference: (value: ThemePreference) => void;
  resolved: 'light' | 'dark';
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return m?.[1] !== undefined ? decodeURIComponent(m[1]) : undefined;
}

function resolveDark(preference: ThemePreference): boolean {
  if (preference === 'dark') return true;
  if (preference === 'light') return false;
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function ThemeProvider({ children }: Readonly<{ children: ReactNode }>) {
  /** Match the server render. The cookie is applied only after mount so hydration stays stable. */
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [ready, setReady] = useState(false);
  const userChose = useRef(false);

  const applyDom = useCallback((pref: ThemePreference) => {
    const dark = resolveDark(pref);
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  }, []);

  useEffect(() => {
    if (userChose.current) return;
    setPreferenceState(parseThemePreference(readCookie(THEME_COOKIE)));
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    applyDom(preference);
  }, [applyDom, preference, ready]);

  useEffect(() => {
    if (!ready || preference !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyDom('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [preference, applyDom, ready]);

  const setPreference = useCallback(
    (value: ThemePreference) => {
      userChose.current = true;
      setPreferenceState(value);
      setReady(true);
      applyDom(value);
      void setThemePreferenceAction(value);
    },
    [applyDom],
  );

  const resolved: 'light' | 'dark' = resolveDark(preference) ? 'dark' : 'light';

  const value = useMemo(
    () => ({
      preference,
      ready,
      setPreference,
      resolved,
    }),
    [preference, ready, setPreference, resolved],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}
