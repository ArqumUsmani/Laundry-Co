import { useSyncExternalStore } from 'react';

export type Theme = 'light' | 'dark';

const KEY = 'lc-theme';
const listeners = new Set<() => void>();

export function getTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

export function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* private mode */
  }
  listeners.forEach((fn) => fn());
}

export function toggleTheme() {
  setTheme(getTheme() === 'dark' ? 'light' : 'dark');
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, getTheme);
}
