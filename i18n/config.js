import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import ja from './locales/ja.json';
import zh from './locales/zh.json';
import { I18N } from '../app.config';

// Language resources
const resources = {
  en: { translation: en },
  ja: { translation: ja },
  zh: { translation: zh },
};

// Initialize i18n synchronously – no expo-localization at import time
// Device language detection happens in LanguageContext (lazy, inside useEffect)
i18n.use(initReactI18next).init({
  resources,
  lng: I18N.fallbackLanguage,
  fallbackLng: I18N.fallbackLanguage,
  compatibilityJSON: 'v3',
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});

export default i18n;
