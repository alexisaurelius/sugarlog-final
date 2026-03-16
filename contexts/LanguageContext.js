import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import i18n from '../i18n/config';
import { getStorageItem, setStorageItem } from '../utils/storage';
import { I18N } from '../app.config';

// Supported languages
const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'ja', name: '日本語', nativeName: '日本語' },
  { code: 'zh', name: '中文', nativeName: '中文' },
];

const LanguageContext = createContext(undefined);

/**
 * Safely get device locales – only loads expo-localization when called
 * (lazy require avoids TurboModule crash on iOS 26+ at app launch)
 */
function getDeviceLocales() {
  if (Platform.OS === 'web') return null;
  try {
    const { getLocales } = require('expo-localization');
    return getLocales();
  } catch (error) {
    console.warn('expo-localization not available:', error?.message);
    return null;
  }
}

function normalizeLanguageCode(code) {
  const normalized = (code || '').toLowerCase().split('-')[0];
  if (normalized === 'zh' || (code || '').toLowerCase().startsWith('zh')) return 'zh';
  return normalized;
}

function getDeviceLanguage() {
  const locales = getDeviceLocales();
  if (locales && locales.length > 0) {
    const deviceLang = normalizeLanguageCode(locales[0]?.languageCode || '');
    const matched = SUPPORTED_LANGUAGES.find((l) => l.code === deviceLang);
    return matched ? matched.code : null;
  }
  return null;
}

export function LanguageProvider({ children }) {
  const [currentLanguage, setCurrentLanguage] = useState(I18N.fallbackLanguage);

  const setLanguage = useCallback(async (languageCode, save = true) => {
    if (!SUPPORTED_LANGUAGES.some((l) => l.code === languageCode)) return;
    try {
      await i18n.changeLanguage(languageCode);
      setCurrentLanguage(languageCode);
      if (save) {
        await setStorageItem(I18N.storageKey, languageCode);
      }
    } catch (error) {
      console.error('Error changing language:', error);
    }
  }, []);

  const loadLanguage = useCallback(async () => {
    try {
      const saved = await getStorageItem(I18N.storageKey, null);
      if (saved && SUPPORTED_LANGUAGES.some((l) => l.code === saved)) {
        await setLanguage(saved, false);
        return;
      }
      const deviceLang = getDeviceLanguage();
      if (deviceLang) {
        await setLanguage(deviceLang, true);
        return;
      }
      await setLanguage(I18N.fallbackLanguage, true);
    } catch (error) {
      console.error('Error loading language:', error);
      await setLanguage(I18N.fallbackLanguage, true);
    }
  }, [setLanguage]);

  useEffect(() => {
    loadLanguage();
  }, []);

  const changeLanguage = useCallback(
    async (languageCode) => {
      await setLanguage(languageCode, true);
    },
    [setLanguage]
  );

  const getLanguageName = useCallback((code) => {
    const lang = SUPPORTED_LANGUAGES.find((l) => l.code === code);
    return lang ? lang.nativeName : code;
  }, []);

  const value = {
    currentLanguage,
    changeLanguage,
    supportedLanguages: SUPPORTED_LANGUAGES,
    getLanguageName,
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
