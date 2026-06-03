import { useTranslation as _useTranslation } from 'react-i18next';
import type { TranslationKeys } from '~/i18n/en';

export function useT() {
  const { t } = _useTranslation();
  // Allow both predefined keys and arbitrary strings for dynamic values
  return t as (key: TranslationKeys | string, obj?: Record<string, any>) => string;
}
