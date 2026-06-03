import { Monitor, Moon, Sun } from 'lucide-react';
import { useState } from 'react';
import { Button } from '~/components/shadcn/button';
import { Card } from '~/components/shadcn/card';
import { Input } from '~/components/shadcn/input';
import { Textarea } from '~/components/shadcn/textarea';
import { useT } from '~/hooks/useT';
import {
  type CustomThemeConfig,
  type ThemeMode,
  applyThemeColors,
  captureCurrentTheme,
  deleteCustomTheme,
  exportTheme,
  getCustomThemes,
  getThemeMode,
  importThemeFromJSON,
  importThemeFromURL,
  loadThemeName,
  presetThemes,
  saveCustomTheme,
  setThemeMode,
} from '~/utils/themes';

interface ThemePanelProps {
  currentThemeName: string;
  onThemeChange: (name: string) => void;
}

export function ThemePanel({ currentThemeName, onThemeChange }: ThemePanelProps) {
  const t = useT();
  const [mode, setMode] = useState<ThemeMode>(getThemeMode());
  const [customThemes, setCustomThemes] = useState<CustomThemeConfig[]>(getCustomThemes());
  const [newThemeName, setNewThemeName] = useState('');
  const [importURL, setImportURL] = useState('');
  const [importJSON, setImportJSON] = useState('');
  const [importError, setImportError] = useState('');
  const [expandedTheme, setExpandedTheme] = useState<string | null>(null);

  const handleModeChange = (newMode: ThemeMode) => {
    setMode(newMode);
    setThemeMode(newMode);
    applyThemeColors(newMode, currentThemeName);
  };

  const handleSelectTheme = (name: string) => {
    applyThemeColors(mode, name);
    onThemeChange(name);
  };

  const handleSaveCurrentTheme = () => {
    if (!newThemeName.trim()) return;
    const captured = captureCurrentTheme();
    const theme: CustomThemeConfig = {
      ...captured,
      name: newThemeName.trim(),
      description: '',
    };
    saveCustomTheme(theme);
    setCustomThemes(getCustomThemes());
    setNewThemeName('');
  };

  const handleDeleteCustomTheme = (name: string) => {
    deleteCustomTheme(name);
    setCustomThemes(getCustomThemes());
    if (currentThemeName === name) {
      handleSelectTheme(presetThemes[0].name);
    }
  };

  const handleExportTheme = (theme: CustomThemeConfig) => {
    const json = exportTheme(theme);
    navigator.clipboard.writeText(json);
  };

  const handleImportFromURL = async () => {
    setImportError('');
    try {
      const themes = await importThemeFromURL(importURL);
      for (const theme of themes) {
        saveCustomTheme(theme);
      }
      setCustomThemes(getCustomThemes());
      setImportURL('');
      // Auto-select first imported theme
      if (themes.length > 0) {
        applyThemeColors(mode, themes[0].name);
        onThemeChange(themes[0].name);
      }
    } catch (e) {
      setImportError(String(e));
    }
  };

  const handleImportFromJSON = () => {
    setImportError('');
    try {
      const themes = importThemeFromJSON(importJSON);
      for (const theme of themes) {
        saveCustomTheme(theme);
      }
      setCustomThemes(getCustomThemes());
      setImportJSON('');
      // Auto-select first imported theme
      if (themes.length > 0) {
        applyThemeColors(mode, themes[0].name);
        onThemeChange(themes[0].name);
      }
    } catch (e) {
      setImportError(String(e));
    }
  };

  const colorPreviewKeys = ['primary', 'accent', 'background', 'muted'] as const;

  const getColorValue = (theme: { colors: { light: Record<string, string>; dark: Record<string, string> } }, key: string): string => {
    const effective = mode === 'light' ? 'light' : 'dark';
    return theme.colors[effective]?.[key] || '';
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Theme Mode */}
      <div>
        <h4 className="text-sm font-medium mb-2">{t('Theme mode')}</h4>
        <div className="grid grid-cols-3 gap-2">
          {([
            { value: 'light' as ThemeMode, icon: Sun, label: t('Light') },
            { value: 'dark' as ThemeMode, icon: Moon, label: t('Dark') },
            { value: 'system' as ThemeMode, icon: Monitor, label: t('System') },
          ]).map(({ value, icon: Icon, label }) => (
            <button
              key={value}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-colors cursor-pointer ${
                mode === value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:bg-muted'
              }`}
              onClick={() => handleModeChange(value)}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Preset Themes */}
      <div>
        <h4 className="text-sm font-medium mb-2">{t('Color scheme')}</h4>
        <div className="grid grid-cols-2 gap-2">
          {presetThemes.map((theme) => (
            <button
              key={theme.name}
              className={`flex items-center gap-2 p-2.5 rounded-lg border transition-colors cursor-pointer text-left ${
                currentThemeName === theme.name
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:bg-muted'
              }`}
              onClick={() => handleSelectTheme(theme.name)}
            >
              <div className="flex gap-1">
                {colorPreviewKeys.map((key) => (
                  <div
                    key={key}
                    className="w-4 h-4 rounded-full border border-border/50"
                    style={{ backgroundColor: `var(--${key})` }}
                  />
                ))}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-medium truncate">{theme.name}</span>
                <span className="text-[10px] text-muted-foreground truncate">{theme.description}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Themes */}
      <div>
        <h4 className="text-sm font-medium mb-2">{t('Custom themes')}</h4>
        {customThemes.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t('No custom themes')}</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {customThemes.map((theme) => (
              <div key={theme.name} className="rounded-lg border border-border overflow-hidden">
                <button
                  className="flex items-center justify-between w-full p-2.5 text-left cursor-pointer hover:bg-muted transition-colors"
                  onClick={() => setExpandedTheme(expandedTheme === theme.name ? null : theme.name)}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {colorPreviewKeys.map((key) => (
                        <div
                          key={key}
                          className="w-3 h-3 rounded-full border border-border/50"
                          style={{ backgroundColor: getColorValue(theme, key) || '#888' }}
                        />
                      ))}
                    </div>
                    <span className="text-xs font-medium">{theme.name}</span>
                  </div>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => handleSelectTheme(theme.name)}
                    >
                      {t('Color scheme')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => handleExportTheme(theme)}
                    >
                      {t('Export')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                      onClick={() => handleDeleteCustomTheme(theme.name)}
                    >
                      {t('Delete')}
                    </Button>
                  </div>
                </button>
                {expandedTheme === theme.name && (
                  <div className="px-2.5 pb-2.5 border-t border-border">
                    <div className="flex gap-1 mt-2">
                      {Object.entries(theme.colors[mode === 'light' ? 'light' : 'dark']).slice(0, 8).map(([key, value]) => (
                        <div
                          key={key}
                          className="w-6 h-6 rounded border border-border/50"
                          style={{ backgroundColor: value }}
                          title={`${key}: ${value}`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Save Current Theme */}
      <div>
        <h4 className="text-sm font-medium mb-2">{t('Save current theme')}</h4>
        <div className="flex gap-2">
          <Input
            value={newThemeName}
            onChange={(e) => setNewThemeName(e.target.value)}
            placeholder={t('Theme name')}
            className="h-8 text-sm"
          />
          <Button size="sm" onClick={handleSaveCurrentTheme} disabled={!newThemeName.trim()}>
            {t('Save')}
          </Button>
        </div>
      </div>

      {/* Import from URL */}
      <div>
        <h4 className="text-sm font-medium mb-2">{t('Import from URL')}</h4>
        <div className="flex gap-2">
          <Input
            value={importURL}
            onChange={(e) => setImportURL(e.target.value)}
            placeholder="https://tweakcn.com/..."
            className="h-8 text-sm"
          />
          <Button size="sm" onClick={handleImportFromURL} disabled={!importURL.trim()}>
            {t('Import')}
          </Button>
        </div>
      </div>

      {/* Import from JSON */}
      <div>
        <h4 className="text-sm font-medium mb-2">{t('Import from JSON')}</h4>
        <Textarea
          value={importJSON}
          onChange={(e) => setImportJSON(e.target.value)}
          placeholder={t('Paste theme JSON here...')}
          className="min-h-[80px] text-sm"
        />
        <Button size="sm" className="mt-2" onClick={handleImportFromJSON} disabled={!importJSON.trim()}>
          {t('Import')}
        </Button>
        {importError && <p className="text-xs text-destructive mt-1">{importError}</p>}
      </div>

      {/* Auto-save hint */}
      <p className="text-[10px] text-muted-foreground">{t('Theme settings are saved automatically')}</p>
    </div>
  );
}
