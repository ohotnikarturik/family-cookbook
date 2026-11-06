import { THEME_COOKIE } from '@/lib/theme';

/** Blocking theme resolution: runs before paint, no cookies() on server (Cache Components). */
export function ThemeScript() {
  const js = String.raw`
(function(){
  try {
    var m = document.cookie.match(/(?:^|; )${THEME_COOKIE}=([^;]+)/);
    var pref = m ? decodeURIComponent(m[1]) : 'system';
    var dark = pref === 'dark' || (pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  } catch (e) {
    document.documentElement.classList.remove('dark');
    document.documentElement.dataset.theme = 'light';
    document.documentElement.style.colorScheme = 'light';
  }
})();
`;

  return <script dangerouslySetInnerHTML={{ __html: js }} />;
}
