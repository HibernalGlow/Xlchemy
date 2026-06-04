import { locale, dictionary, addMessages, init, _ } from 'svelte-i18n';
import { derived, get as getStore } from 'svelte/store';
import en from './en.json';
import zh from './zh.json';

const STORAGE_KEY = 'xlchemy-language';

function getSavedLanguage(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || 'en';
  } catch {
    return 'en';
  }
}

addMessages('en', en);
addMessages('zh', zh);

export function initI18n() {
  const lang = getSavedLanguage();
  init({
    fallbackLocale: 'en',
    initialLocale: lang,
  });
  document.documentElement.lang = lang;
}

export function setLanguage(lang: string): void {
  locale.set(lang);
  document.documentElement.lang = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {}
}

export function getCurrentLanguage(): string {
  const $locale = getStore(locale);
  return $locale || 'en';
}

// Reactive derived store for current locale string (for non-component usage)
export const currentLocale = derived(locale, ($locale) => $locale || 'en');

// Direct translation helper for non-reactive contexts (use $_ in components instead)
export function t(key: string, options?: Record<string, unknown>): string {
  return getStore(_)(key, options) || key;
}

export { locale, dictionary };
