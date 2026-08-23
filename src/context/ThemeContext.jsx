import { createContext, useCallback, useEffect, useMemo, useState } from 'react';

const THEME_KEY = 'jd_theme';
const ANIM_DURATION = 320;

const getInitialTheme = () => {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    /* ignore storage errors */
  }
  // Default to light theme on first visit, regardless of the OS preference.
  return 'light';
};

const applyTheme = (theme) => {
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(theme);
  root.style.colorScheme = theme;
};

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    applyTheme(theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* ignore storage errors */
    }
  }, [theme]);

  useEffect(() => {
    let stored = null;
    try {
      stored = localStorage.getItem(THEME_KEY);
    } catch {
      /* ignore storage errors */
    }
    if (stored) return undefined;

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e) => setTheme(e.matches ? 'dark' : 'light');
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const root = document.documentElement;
      root.classList.add('theme-anim');
      window.setTimeout(() => root.classList.remove('theme-anim'), ANIM_DURATION);
      return current === 'dark' ? 'light' : 'dark';
    });
  }, []);

  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export default ThemeContext;
