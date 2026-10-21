import { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'apex-site-theme';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
  );

  useEffect(() => {
    const syncTheme = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      const next = event.newValue === 'dark' ? 'dark' : 'light';
      document.documentElement.dataset.theme = next;
      setTheme(next);
    };
    window.addEventListener('storage', syncTheme);
    return () => window.removeEventListener('storage', syncTheme);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    setTheme(next);
    try { window.localStorage.setItem(STORAGE_KEY, next); } catch { /* Keep the in-memory choice. */ }
  };

  return { theme, toggleTheme };
}
