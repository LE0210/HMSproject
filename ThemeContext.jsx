import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';

const ThemeContext = createContext(null);
const STORAGE_KEY = 'hms.theme';

const isBrowser = typeof window !== 'undefined';

/** Which theme the visitor should see before they have chosen. */
function preferredTheme() {
  if (!isBrowser) return 'light';
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function storedTheme() {
  if (!isBrowser) return null;
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === 'light' || saved === 'dark' ? saved : null;
}

export function ThemeProvider({ children }) {
  // Honour an explicit choice, otherwise follow the operating system.
  const [theme, setTheme] = useState(() => storedTheme() ?? preferredTheme());

  useEffect(() => {
    if (!isBrowser) return undefined;

    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    // Tells the browser to render native widgets (scrollbars, date pickers,
    // select dropdowns) in the matching scheme.
    root.style.colorScheme = theme;

    if (storedTheme()) localStorage.setItem(STORAGE_KEY, theme);

    // Follow OS changes only while the user has not picked a theme.
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!media) return undefined;

    const onChange = (e) => {
      if (!storedTheme()) setTheme(e.matches ? 'dark' : 'light');
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((t) => {
      const next = t === 'dark' ? 'light' : 'dark';
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  const value = useMemo(() => ({ theme, setTheme, toggle, isDark: theme === 'dark' }), [theme, toggle]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}

export default ThemeProvider;