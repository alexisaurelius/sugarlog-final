import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import en from './locales/en.json';
import ja from './locales/ja.json';
import zh from './locales/zh.json';
import { getStorageItem, setStorageItem } from '../utils/storage';

const STORAGE_KEY = 'app_language';

// Language resources
const resources = {
  en: { translation: en },
  ja: { translation: ja },
  zh: { translation: zh },
};

// Get saved language or detect device language
const getInitialLanguage = async () => {
  try {
    const savedLanguage = await getStorageItem(STORAGE_KEY, null);
    if (savedLanguage && resources[savedLanguage]) {
      return savedLanguage;
    }
    
    // Detect device language
    const deviceLocale = Localization.getLocales()[0];
    const deviceLanguage = deviceLocale?.languageCode || 'en';
    // Map zh-CN, zh-TW to zh
    const normalizedLanguage = deviceLanguage.startsWith('zh') ? 'zh' : deviceLanguage;
    const supportedLanguage = resources[normalizedLanguage] ? normalizedLanguage : 'en';
    
    // Save detected language
    await setStorageItem(STORAGE_KEY, supportedLanguage);
    return supportedLanguage;
  } catch (error) {
    console.error('Error getting initial language:', error);
    return 'en';
  }
};

// Initialize i18n synchronously first, then update language
i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // Default, will be updated
    fallbackLng: 'en',
    compatibilityJSON: 'v3',
    interpolation: {
      escapeValue: false, // React already escapes
    },
  });

// Initialize with device language
getInitialLanguage().then((language) => {
  i18n.changeLanguage(language);
});

// Change language function
export const changeLanguage = async (languageCode) => {
  if (resources[languageCode]) {
    await setStorageItem(STORAGE_KEY, languageCode);
    i18n.changeLanguage(languageCode);
  }
};

export default i18n;
