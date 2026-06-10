import { createContext, use, useEffect, useState } from 'react';

import type { ReactNode } from 'react';

import { storageKeys } from '@/lib/constants/keys';

type Theme = 'dark' | 'light' | 'system';

type ThemeProvider = {
  children: ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
  theme: 'system',
  setTheme: () => null
};

const ThemeProviderContext = createContext(initialState);

export default function ThemeProvider({
  children,
  defaultTheme = 'dark',
  storageKey = storageKeys.theme,
  ...properties
}: Readonly<ThemeProvider>) {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    const root = globalThis.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add('dark');
  }, [theme]);

  const value = {
    theme: 'dark' as Theme,
    setTheme: (_theme: Theme) => {
      localStorage.setItem(storageKey, defaultTheme);
      setTheme(defaultTheme);
    }
  };

  return (
    <ThemeProviderContext {...properties} value={value}>
      {children}
    </ThemeProviderContext>
  );
}

export const useTheme = () => {
  const context = use(ThemeProviderContext);
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (context == undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
};
