import { useState, useEffect, useCallback } from 'react';
import { loadSettings, saveSettings } from '../utils/settings';
import { useMediaQuery } from './useMediaQuery';

export function useSettings() {
  const [settings, setSettings] = useState(loadSettings);
  const prefersLight = useMediaQuery('(prefers-color-scheme: light)');

  const update = useCallback(patch => {
    setSettings(prev => {
      const next = { ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) };
      saveSettings(next);
      return next;
    });
  }, []);

  const resolvedTheme = settings.theme === 'system' ? (prefersLight ? 'light' : 'dark') : settings.theme;

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolvedTheme === 'light' ? '#ffffff' : '#07080e');
  }, [resolvedTheme]);

  return { settings, update, resolvedTheme };
}
