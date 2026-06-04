import i18next from 'i18next';

class I18nState {
  _lang = $state(i18next.language);
  t = (key: string): string => {
    void this._lang;
    return i18next.t(key) as string;
  };
}

export const i18n = new I18nState();

i18next.on('languageChanged', (lng: string) => {
  i18n._lang = lng;
});
