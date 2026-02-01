import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { getTheme, getEffectiveColors, THEMES, THEME_IDS } from './themes';
import { STORAGE_KEYS, getStorageItem, setStorageItem } from './storage';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [themeId, setThemeIdState] = useState(THEME_IDS.DEFAULT);

  useEffect(() => {
    (async () => {
      const stored = await getStorageItem(STORAGE_KEYS.THEME, THEME_IDS.DEFAULT);
      if (THEMES[stored]) setThemeIdState(stored);
    })();
  }, []);

  const setTheme = useCallback(async (id) => {
    if (!THEMES[id]) return;
    setThemeIdState(id);
    await setStorageItem(STORAGE_KEYS.THEME, id);
  }, []);

  const theme = useMemo(() => {
    const base = getTheme(themeId);
    return { ...base, colors: getEffectiveColors(base) };
  }, [themeId]);

  return (
    <ThemeContext.Provider value={{ theme, themeId, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx.theme;
}

export function useThemeContext() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeContext must be used within ThemeProvider');
  return ctx;
}
