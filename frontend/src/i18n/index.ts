import i18n from 'i18next';
import { en } from './en';
import { zh } from './zh';

const STORAGE_KEY = 'xlchemy-language';

function getSavedLanguage(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || 'en';
  } catch {
    return 'en';
  }
}

export function setLanguage(lang: string): void {
  i18n.changeLanguage(lang);
  document.documentElement.lang = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {}
}

export function getCurrentLanguage(): string {
  return i18n.language || 'en';
}

export function initI18n() {
  const resources = {
    en: { translation: en },
    zh: { translation: zh },
  };

  const lang = getSavedLanguage();

  i18n.init({
    resources,
    lng: lang,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });

  document.documentElement.lang = lang;
}
