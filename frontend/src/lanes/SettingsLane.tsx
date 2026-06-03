import * as React from 'react';
import { useAppState } from '~/hooks/useAppState';
import { useT } from '~/hooks/useT';
import { LaneCard } from '~/components/canvas/LaneCard';
import { Button } from '~/components/ui/Button';
import { Checkbox } from '~/components/ui/Checkbox';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '~/components/ui/Select';
import { Input } from '~/components/ui/Input';
import { Textarea } from '~/components/ui/Textarea';
import { Slider } from '~/components/ui/Slider';
import { ThemePanel } from '~/views/theme-panel';

export function SettingsLane() {
  const t = useT();
  const {
    appSettings,
    setAppSettings,
    currentLang,
    changeLanguage,
    changeTheme,
    setShowImportDialog,
    handleExportSettings,
  } = useAppState();

  return (
    <>
      {/* Appearance Card */}
      <LaneCard id="settings-appearance" header={t('Appearance')}>
        <div className="flex flex-col gap-3">
          <div className="flex gap-2 items-center">
            <span className="text-[11px] text-text-2 shrink-0">{t('Language:')}</span>
            <Select value={currentLang} onValueChange={(v) => changeLanguage(v)}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="zh">中文</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <ThemePanel
            currentThemeName={appSettings.theme || 'Miku'}
            onThemeChange={changeTheme}
          />
        </div>
      </LaneCard>

      {/* General Card */}
      <LaneCard id="settings-general" header={t('General')} defaultCollapsed>
        <div className="flex flex-col gap-2">
          {[
            { key: 'disable_downscaling_startup', label: t('Disable downscaling on startup') },
            { key: 'disable_delete_startup', label: t('Disable delete original on startup') },
            { key: 'sorting_disabled', label: t('Disable sorting') },
            { key: 'enable_quality_precision_snapping', label: t('Quality precision snapping') },
            { key: 'play_sound_on_finish', label: t('Play sound on finish') },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center gap-2">
              <Checkbox
                id={key}
                checked={!!appSettings[key]}
                onCheckedChange={(v) =>
                  setAppSettings((prev: any) => ({ ...prev, [key]: !!v }))
                }
              />
              <label htmlFor={key} className="text-[11px] text-text-1 cursor-pointer">{label}</label>
            </div>
          ))}
          {appSettings.play_sound_on_finish && (
            <div className="flex gap-2 items-center ml-5">
              <span className="text-[11px] text-text-2">{t('Volume:')}</span>
              <Slider
                value={[appSettings.play_sound_on_finish_vol ?? 60]}
                onValueChange={([v]) =>
                  setAppSettings((prev: any) => ({ ...prev, play_sound_on_finish_vol: v }))
                }
                min={0}
                max={100}
                className="w-28"
              />
              <span className="text-[11px] text-text-2 w-7">{appSettings.play_sound_on_finish_vol ?? 60}%</span>
            </div>
          )}
        </div>
      </LaneCard>

      {/* Conversion Card */}
      <LaneCard id="settings-conversion" header={t('Conversion')} defaultCollapsed>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Checkbox id="jxl_lossy_modular" checked={!!appSettings.jxl_lossy_modular}
              onCheckedChange={(v) => setAppSettings((prev: any) => ({ ...prev, jxl_lossy_modular: !!v }))} />
            <label htmlFor="jxl_lossy_modular" className="text-[11px] text-text-1 cursor-pointer">{t('JXL lossy modular')}</label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="jxl_auto_lossless_jpeg" checked={!!appSettings.jxl_auto_lossless_jpeg}
              onCheckedChange={(v) => setAppSettings((prev: any) => ({ ...prev, jxl_auto_lossless_jpeg: !!v }))} />
            <label htmlFor="jxl_auto_lossless_jpeg" className="text-[11px] text-text-1 cursor-pointer">{t('Auto lossless JPEG transcode for JXL')}</label>
          </div>

          <div className="flex gap-2 items-center">
            <span className="text-[11px] text-text-2 shrink-0">{t('JPEG Encoder:')}</span>
            <Select value={appSettings.jpg_encoder || 'JPEGLI'}
              onValueChange={(v) => setAppSettings((prev: any) => ({ ...prev, jpg_encoder: v }))}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['JPEGLI', 'libjpeg'].map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {appSettings.jpg_encoder === 'JPEGLI' && (
            <div className="flex items-center gap-2 ml-4">
              <Checkbox id="disable_progressive_jpegli" checked={!!appSettings.disable_progressive_jpegli}
                onCheckedChange={(v) => setAppSettings((prev: any) => ({ ...prev, disable_progressive_jpegli: !!v }))} />
              <label htmlFor="disable_progressive_jpegli" className="text-[11px] text-text-1 cursor-pointer">{t('Disable progressive JPEGLI')}</label>
            </div>
          )}

          <div className="flex gap-2 items-center">
            <span className="text-[11px] text-text-2 shrink-0">{t('AVIF Encoder:')}</span>
            <Select value={appSettings.avif_encoder || 'AOM AV1'}
              onValueChange={(v) => setAppSettings((prev: any) => ({ ...prev, avif_encoder: v }))}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['AOM AV1', 'SVT-AV1-PSY', 'slimg'].map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 items-center">
            <span className="text-[11px] text-text-2 shrink-0">{t('AVIF bit depth:')}</span>
            <Select value={appSettings.avif_bit_depth || 'Auto'}
              onValueChange={(v) => setAppSettings((prev: any) => ({ ...prev, avif_bit_depth: v }))}>
              <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['Auto', '12', '10', '8'].map((opt) => <SelectItem key={opt} value={opt}>{opt === 'Auto' ? t(opt) : opt}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {appSettings.avif_encoder === 'AOM AV1' && (
            <div className="flex items-center gap-2 ml-4">
              <Checkbox id="avif_aom_iq_tune" checked={!!appSettings.avif_aom_iq_tune}
                onCheckedChange={(v) => setAppSettings((prev: any) => ({ ...prev, avif_aom_iq_tune: !!v }))} />
              <label htmlFor="avif_aom_iq_tune" className="text-[11px] text-text-1 cursor-pointer">{t('AOM IQ Tune')}</label>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Checkbox id="keep_if_larger" checked={!!appSettings.keep_if_larger}
              onCheckedChange={(v) => setAppSettings((prev: any) => ({ ...prev, keep_if_larger: !!v }))} />
            <label htmlFor="keep_if_larger" className="text-[11px] text-text-1 cursor-pointer">{t('Keep original if result is larger')}</label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="copy_if_larger" checked={!!appSettings.copy_if_larger}
              onCheckedChange={(v) => setAppSettings((prev: any) => ({ ...prev, copy_if_larger: !!v }))} />
            <label htmlFor="copy_if_larger" className="text-[11px] text-text-1 cursor-pointer">{t('Copy original if result is larger')}</label>
          </div>
        </div>
      </LaneCard>

      {/* ExifTool Card */}
      <LaneCard id="settings-exiftool" header={t('ExifTool')} defaultCollapsed>
        <div className="flex flex-col gap-2">
          {[
            { key: 'ExifTool - Wipe', label: t('Wipe command:') },
            { key: 'ExifTool - Preserve', label: t('Preserve command:') },
            { key: 'ExifTool - Unsafe Wipe', label: t('Unsafe Wipe command:') },
            { key: 'ExifTool - Custom', label: t('Custom command:') },
          ].map(({ key, label }) => (
            <div key={key} className="flex flex-col gap-1">
              <span className="text-[11px] text-text-2">{label}</span>
              <Textarea
                value={appSettings.exiftool_args?.[key] || ''}
                onChange={(e) =>
                  setAppSettings((prev: any) => ({
                    ...prev,
                    exiftool_args: { ...prev.exiftool_args, [key]: e.target.value },
                  }))
                }
                className="min-h-[40px] text-xs font-mono"
              />
            </div>
          ))}
          <Button
            kind="outline" variant="neutral" size="sm" className="w-fit mt-1"
            onClick={() =>
              setAppSettings((prev: any) => ({
                ...prev,
                exiftool_args: {
                  'ExifTool - Wipe': '-overwrite_original -all= -tagsFromFile @ -ICC_Profile -ColorSpace -Orientation',
                  'ExifTool - Preserve': '-overwrite_original -tagsFromFile @',
                  'ExifTool - Unsafe Wipe': '-overwrite_original -all=',
                  'ExifTool - Custom': '',
                },
              }))
            }
          >
            {t('Reset to defaults')}
          </Button>
        </div>
      </LaneCard>

      {/* Advanced Card */}
      <LaneCard id="settings-advanced" header={t('Advanced')} defaultCollapsed>
        <div className="flex flex-col gap-2">
          <div className="flex gap-2 items-center">
            <span className="text-[11px] text-text-2 shrink-0">{t('RAM optimizer:')}</span>
            <Select value={appSettings.ram_optimizer || 'Dynamic'}
              onValueChange={(v) => setAppSettings((prev: any) => ({ ...prev, ram_optimizer: v }))}>
              <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['Dynamic', 'Static', 'Disabled'].map((opt) => <SelectItem key={opt} value={opt}>{t(opt)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {appSettings.ram_optimizer === 'Static' && (
            <div className="flex flex-col gap-1 ml-4">
              <span className="text-[11px] text-text-2">{t('Optimization rules:')}</span>
              <Textarea
                value={appSettings.ram_optimizer_rules || ''}
                onChange={(e) => setAppSettings((prev: any) => ({ ...prev, ram_optimizer_rules: e.target.value }))}
                className="min-h-[40px] text-xs font-mono"
              />
            </div>
          )}

          {[
            { key: 'enable_jxl_effort_10', label: t('JXL effort 10') },
            { key: 'custom_resampling', label: t('Custom resampling') },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center gap-2">
              <Checkbox id={key} checked={!!appSettings[key]}
                onCheckedChange={(v) => setAppSettings((prev: any) => ({ ...prev, [key]: !!v }))} />
              <label htmlFor={key} className="text-[11px] text-text-1 cursor-pointer">{label}</label>
            </div>
          ))}

          <div className="flex items-center gap-2">
            <Checkbox id="enable_custom_args" checked={!!appSettings.enable_custom_args}
              onCheckedChange={(v) => setAppSettings((prev: any) => ({ ...prev, enable_custom_args: !!v }))} />
            <label htmlFor="enable_custom_args" className="text-[11px] text-text-1 cursor-pointer">{t('Extra encoder args')}</label>
          </div>

          {appSettings.enable_custom_args && (
            <div className="flex flex-col gap-2 ml-4">
              {[
                { key: 'cjxl_args', label: t('cjxl args:') },
                { key: 'avifenc_args', label: t('avifenc args:') },
                { key: 'cjpegli_args', label: t('cjpegli args:') },
                { key: 'im_args', label: t('ImageMagick args:') },
              ].map(({ key, label }) => (
                <div key={key} className="flex flex-col gap-1">
                  <span className="text-[11px] text-text-2">{label}</span>
                  <Input
                    value={appSettings[key] || ''}
                    onChange={(e) => setAppSettings((prev: any) => ({ ...prev, [key]: e.target.value }))}
                    className="h-7 text-xs font-mono"
                  />
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 items-center">
            <span className="text-[11px] text-text-2 shrink-0">{t('Processing order:')}</span>
            <Select value={appSettings.processing_order || 'Original'}
              onValueChange={(v) => setAppSettings((prev: any) => ({ ...prev, processing_order: v }))}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['Original', 'Random', 'Sequential', 'Path Ascending', 'Path Descending', 'Size Ascending', 'Size Descending'].map((opt) => (
                  <SelectItem key={opt} value={opt}>{t(opt)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Import / Export */}
          <div className="flex gap-2 mt-1 pt-2 border-t border-[var(--border-2)]/50">
            <Button kind="outline" variant="neutral" size="sm" onClick={handleExportSettings}>
              {t('Export')}
            </Button>
            <Button kind="outline" variant="neutral" size="sm" onClick={() => setShowImportDialog(true)}>
              {t('Import')}
            </Button>
          </div>

          <div className="flex gap-2 mt-1">
            <Button kind="outline" variant="neutral" size="sm" onClick={() => {}}>{t('Start logging')}</Button>
            <Button kind="outline" variant="neutral" size="sm" onClick={() => {}}>{t('Open log directory')}</Button>
          </div>
        </div>
      </LaneCard>
    </>
  );
}
