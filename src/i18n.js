import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en/translation.json';
import hi from './locales/hi/translation.json';
import mr from './locales/mr/translation.json';
import gu from './locales/gu/translation.json';

export const LANGUAGE_CODES = {
  English: 'en',
  Hindi: 'hi',
  Marathi: 'mr',
  Gujarati: 'gu',
};

export const LANGUAGE_OPTIONS = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी' },
  { code: 'mr', label: 'Marathi', nativeLabel: 'मराठी' },
  { code: 'gu', label: 'Gujarati', nativeLabel: 'ગુજરાતી' },
];

export const codeToLanguage = (code) => {
  const found = LANGUAGE_OPTIONS.find((opt) => opt.code === code);
  return found ? found.label : 'English';
};

const SETTINGS_KEY = 'jd_settings';

const jdSettingsDetector = {
  name: 'jdSettings',
  lookup() {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.language && LANGUAGE_CODES[parsed.language]) {
          return LANGUAGE_CODES[parsed.language];
        }
      }
    } catch {
      /* ignore storage errors */
    }
    return undefined;
  },
  cacheUserLanguage() {
    /* language name is persisted via ProfileMenu settings */
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
      mr: { translation: mr },
      gu: { translation: gu },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'hi', 'mr', 'gu'],
    nonExplicitSupportedLngs: true,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['jdSettings', 'localStorage', 'navigator'],
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage'],
      customDetectors: { jdSettings: jdSettingsDetector },
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;
