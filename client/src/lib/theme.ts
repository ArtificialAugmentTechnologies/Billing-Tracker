import { useEffect, useState } from 'react';
import { readStorage, writeStorage } from './utils';

type Theme = 'light' | 'dark';

const STORAGE_KEY = 'a2-theme';

const storedTheme = (): Theme => (readStorage(STORAGE_KEY) === 'dark' ? 'dark' : 'light');

/** Runs before the first render, so a dark-mode user never sees a flash of the light theme. */
export function applyStoredTheme() {
  document.documentElement.classList.toggle('dark', storedTheme() === 'dark');
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(storedTheme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    writeStorage(STORAGE_KEY, theme);
  }, [theme]);

  return {
    theme,
    toggleTheme: () => setTheme((current) => (current === 'dark' ? 'light' : 'dark')),
  };
}
