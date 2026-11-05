import { useEffect, useState } from 'react';
import { readStorage, writeStorage } from './utils';

type Theme = 'light' | 'dark';

const STORAGE_KEY = 'a2-theme';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() =>
    readStorage(STORAGE_KEY) === 'dark' ? 'dark' : 'light',
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    writeStorage(STORAGE_KEY, theme);
  }, [theme]);

  return {
    theme,
    toggleTheme: () => setTheme((current) => (current === 'dark' ? 'light' : 'dark')),
  };
}
