import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/shadcn/card';
import { Switch } from '~/components/shadcn/switch';
import { Label } from '~/components/shadcn/label';
import { Slider } from '~/components/shadcn/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/shadcn/select';
import { Separator } from '~/components/shadcn/separator';
import { Button } from '~/components/shadcn/button';
import { Input } from '~/components/shadcn/input';
import { Textarea } from '~/components/shadcn/textarea';
import { PRESET_THEMES } from '~/utils/themeManager';
import { useSetAtom } from 'jotai';
import { selectThemeAtom, setThemeModeAtom } from '~/atom/theme';
import { useAtomValue } from 'jotai';
import { selectedThemeAtom, themeAtom } from '~/atom/primitive';
import {
  PROCESSING_ORDERS,
  JPEG_ENCODERS,
  AVIF_ENCODERS,
  AVIF_BIT_DEPTH_AOM,
  AVIF_BIT_DEPTH_SVT,
} from '~/consts';
import { Theme } from '~/consts';
import type { GeneralSettings } from '~/types';
import { getAPI } from '~/utils/api';
import { toast } from 'sonner';

export interface SettingsTabRef {
  getSettings: () => GeneralSettings;
}

interface SettingsTabProps {
  initialSettings: GeneralSettings;
  loggingEnabled: boolean;
  onSettingsChange?: (settings: GeneralSettings) => void;
  onLoggingChanged?: (enabled: boolean) => void;
}

const DEFAULT_RAM_OPTIMIZER_RULES =
  '("all", 3.5, "7/8"), ("all", 4.5, "6/8"), ("all", 5.5, "5/8"), ("all", 6.5, "4/8"), ("all", 7.5, "3/8"), ("all", 8.5, "2/8"), ("all", 9.5, "1/8"), ("all", 10.5, "1")';

export const SettingsTab = forwardRef<SettingsTabRef, SettingsTabProps>(function SettingsTab({
  initialSettings,
  loggingEnabled,
  onSettingsChange,
  onLoggingChanged,
}, ref) {
  const [category, setCategory] = useState<'General' | 'Conversion' | 'ExifTool' | 'Advanced'>('General');
  const [processingOrder, setProcessingOrder] = useState(initialSettings.processing_order);
  const [playSoundOnFinish, setPlaySoundOnFinish] = useState(initialSettings.play_sound_on_finish);
  const [playSoundVolume, setPlaySoundVolume] = useState(Math.round(initialSettings.play_sound_on_finish_vol * 100));
  const [sortingDisabled, setSortingDisabled] = useState(initialSettings.sorting_disabled);
  const [disableDownscalingStartup, setDisableDownscalingStartup] = useState(initialSettings.disable_downscaling_startup);
  const [disableDeleteStartup, setDisableDeleteStartup] = useState(initialSettings.disable_delete_startup);
  const [qualityPrecSnap, setQualityPrecSnap] = useState(initialSettings.enable_quality_precision_snapping);
  const [jxlEffort10, setJxlEffort10] = useState(initialSettings.enable_jxl_effort_10);
  const [jxlAutoLossless, setJxlAutoLossless] = useState(initialSettings.jxl_auto_lossless_jpeg);
  const [jxlLossyModular, setJxlLossyModular] = useState(initialSettings.jxl_lossy_modular);
  const [jxlIntEffort, setJxlIntEffort] = useState(initialSettings.jxl_int_effort);
  const [customResampling, setCustomResampling] = useState(initialSettings.custom_resampling);
  const [jpgEncoder, setJpgEncoder] = useState(initialSettings.jpg_encoder);
  const [disableProgressiveJpegli, setDisableProgressiveJpegli] = useState(initialSettings.disable_progressive_jpegli);
  const [avifEncoder, setAvifEncoder] = useState(initialSettings.avif_encoder);
  const [avifBitDepth, setAvifBitDepth] = useState(initialSettings.avif_bit_depth);
  const [avifIqTune, setAvifIqTune] = useState(initialSettings.avif_aom_iq_tune);
  const [keepIfLarger, setKeepIfLarger] = useState(initialSettings.keep_if_larger);
  const [copyIfLarger, setCopyIfLarger] = useState(initialSettings.copy_if_larger);
  const [ramOptimizer, setRamOptimizer] = useState(initialSettings.ram_optimizer);
  const [ramOptimizerRules, setRamOptimizerRules] = useState(initialSettings.ram_optimizer_rules || DEFAULT_RAM_OPTIMIZER_RULES);
  const [enableCustomArgs, setEnableCustomArgs] = useState(initialSettings.enable_custom_args);
  const [cjxlArgs, setCjxlArgs] = useState(initialSettings.cjxl_args);
  const [avifencArgs, setAvifencArgs] = useState(initialSettings.avifenc_args);
  const [cjpegliArgs, setCjpegliArgs] = useState(initialSettings.cjpegli_args);
  const [imArgs, setImArgs] = useState(initialSettings.im_args);
  const [exiftoolWipe, setExiftoolWipe] = useState(initialSettings.exiftool_args['ExifTool - Wipe'] || '');
  const [exiftoolPreserve, setExiftoolPreserve] = useState(initialSettings.exiftool_args['ExifTool - Preserve'] || '');
  const [exiftoolUnsafe, setExiftoolUnsafe] = useState(initialSettings.exiftool_args['ExifTool - Unsafe Wipe'] || '');
  const [exiftoolCustom, setExiftoolCustom] = useState(initialSettings.exiftool_args['ExifTool - Custom'] || '');
  const [logging, setLogging] = useState(loggingEnabled);

  const selectTheme = useSetAtom(selectThemeAtom);
  const setThemeMode = useSetAtom(setThemeModeAtom);
  const currentTheme = useAtomValue(themeAtom);
  const selectedTheme = useAtomValue(selectedThemeAtom);

  useEffect(() => {
    setProcessingOrder(initialSettings.processing_order);
    setPlaySoundOnFinish(initialSettings.play_sound_on_finish);
    setPlaySoundVolume(Math.round(initialSettings.play_sound_on_finish_vol * 100));
    setSortingDisabled(initialSettings.sorting_disabled);
    setDisableDownscalingStartup(initialSettings.disable_downscaling_startup);
    setDisableDeleteStartup(initialSettings.disable_delete_startup);
    setQualityPrecSnap(initialSettings.enable_quality_precision_snapping);
    setJxlEffort10(initialSettings.enable_jxl_effort_10);
    setJxlAutoLossless(initialSettings.jxl_auto_lossless_jpeg);
    setJxlLossyModular(initialSettings.jxl_lossy_modular);
    setJxlIntEffort(initialSettings.jxl_int_effort);
    setCustomResampling(initialSettings.custom_resampling);
    setJpgEncoder(initialSettings.jpg_encoder);
    setDisableProgressiveJpegli(initialSettings.disable_progressive_jpegli);
    setAvifEncoder(initialSettings.avif_encoder);
    setAvifBitDepth(initialSettings.avif_bit_depth);
    setAvifIqTune(initialSettings.avif_aom_iq_tune);
    setKeepIfLarger(initialSettings.keep_if_larger);
    setCopyIfLarger(initialSettings.copy_if_larger);
    setRamOptimizer(initialSettings.ram_optimizer);
    setRamOptimizerRules(initialSettings.ram_optimizer_rules || DEFAULT_RAM_OPTIMIZER_RULES);
    setEnableCustomArgs(initialSettings.enable_custom_args);
    setCjxlArgs(initialSettings.cjxl_args);
    setAvifencArgs(initialSettings.avifenc_args);
    setCjpegliArgs(initialSettings.cjpegli_args);
    setImArgs(initialSettings.im_args);
    setExiftoolWipe(initialSettings.exiftool_args['ExifTool - Wipe'] || '');
    setExiftoolPreserve(initialSettings.exiftool_args['ExifTool - Preserve'] || '');
    setExiftoolUnsafe(initialSettings.exiftool_args['ExifTool - Unsafe Wipe'] || '');
    setExiftoolCustom(initialSettings.exiftool_args['ExifTool - Custom'] || '');
  }, [initialSettings]);

  useEffect(() => {
    setLogging(loggingEnabled);
  }, [loggingEnabled]);

  useEffect(() => {
    if (avifEncoder === 'AOM AV1') {
      if (!AVIF_BIT_DEPTH_AOM.includes(avifBitDepth as typeof AVIF_BIT_DEPTH_AOM[number])) {
        setAvifBitDepth('Auto');
      }
    } else if (avifEncoder === 'SVT-AV1-PSY') {
      if (!AVIF_BIT_DEPTH_SVT.includes(avifBitDepth as typeof AVIF_BIT_DEPTH_SVT[number])) {
        setAvifBitDepth('Auto');
      }
    }
  }, [avifEncoder, avifBitDepth]);

  const settingsPayload = useMemo<GeneralSettings>(() => ({
    custom_resampling: customResampling,
    sorting_disabled: sortingDisabled,
    disable_downscaling_startup: disableDownscalingStartup,
    disable_delete_startup: disableDeleteStartup,
    enable_jxl_effort_10: jxlEffort10,
    disable_progressive_jpegli: disableProgressiveJpegli,
    enable_custom_args: enableCustomArgs,
    cjxl_args: cjxlArgs,
    avifenc_args: avifencArgs,
    cjpegli_args: cjpegliArgs,
    im_args: imArgs,
    enable_quality_precision_snapping: qualityPrecSnap,
    jpg_encoder: jpgEncoder,
    jxl_auto_lossless_jpeg: jxlAutoLossless,
    ram_optimizer: ramOptimizer,
    ram_optimizer_rules: ramOptimizerRules,
    jxl_lossy_modular: jxlLossyModular,
    jxl_int_effort: jxlIntEffort,
    play_sound_on_finish: playSoundOnFinish,
    play_sound_on_finish_vol: playSoundVolume / 100,
    keep_if_larger: keepIfLarger,
    copy_if_larger: copyIfLarger,
    exiftool_args: {
      'ExifTool - Wipe': exiftoolWipe,
      'ExifTool - Preserve': exiftoolPreserve,
      'ExifTool - Unsafe Wipe': exiftoolUnsafe,
      'ExifTool - Custom': exiftoolCustom,
    },
    avif_encoder: avifEncoder,
    avif_bit_depth: avifBitDepth,
    avif_aom_iq_tune: avifIqTune,
    processing_order: processingOrder,
  }), [
    customResampling,
    sortingDisabled,
    disableDownscalingStartup,
    disableDeleteStartup,
    jxlEffort10,
    disableProgressiveJpegli,
    enableCustomArgs,
    cjxlArgs,
    avifencArgs,
    cjpegliArgs,
    imArgs,
    qualityPrecSnap,
    jpgEncoder,
    jxlAutoLossless,
    ramOptimizer,
    ramOptimizerRules,
    jxlLossyModular,
    jxlIntEffort,
    playSoundOnFinish,
    playSoundVolume,
    keepIfLarger,
    copyIfLarger,
    exiftoolWipe,
    exiftoolPreserve,
    exiftoolUnsafe,
    exiftoolCustom,
    avifEncoder,
    avifBitDepth,
    avifIqTune,
    processingOrder,
  ]);

  useEffect(() => {
    onSettingsChange?.(settingsPayload);
  }, [settingsPayload, onSettingsChange]);

  useImperativeHandle(ref, () => ({
    getSettings: () => settingsPayload,
  }));

  const toggleLogging = async () => {
    const api = getAPI();
    if (!api) return;
    const result = await api.toggleLogging();
    setLogging(result.enabled);
    onLoggingChanged?.(result.enabled);
  };

  const openLogsDir = async () => {
    const api = getAPI();
    if (!api) return;
    const result = await api.openLogsDir();
    if (!result.ok) {
      toast.error('Open Logs', { description: result.message || 'Failed to open logs directory.' });
    }
  };

  const wipeLogsDir = async () => {
    const api = getAPI();
    if (!api) return;
    const result = await api.wipeLogsDir();
    if (result.ok) {
      toast.success('Logs', { description: result.message || 'Logs folder wiped.' });
    } else {
      toast.error('Logs', { description: result.message || 'Failed to wipe logs.' });
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {(['General', 'Conversion', 'ExifTool', 'Advanced'] as const).map((item) => (
            <Button
              key={item}
              size="sm"
              variant={category === item ? 'default' : 'outline'}
              onClick={() => setCategory(item)}
            >
              {item}
            </Button>
          ))}
        </div>

        {category === 'General' && (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Processing Order</Label>
              <Select value={processingOrder} onValueChange={setProcessingOrder}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROCESSING_ORDERS.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Switch checked={sortingDisabled} onCheckedChange={setSortingDisabled} />
              <Label>Input - Disable Sorting</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch checked={disableDownscalingStartup} onCheckedChange={setDisableDownscalingStartup} />
              <Label>Disable Downscaling on Startup</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch checked={disableDeleteStartup} onCheckedChange={setDisableDeleteStartup} />
              <Label>Disable Delete Original on Startup</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch checked={qualityPrecSnap} onCheckedChange={setQualityPrecSnap} />
              <Label>Quality Slider - Snap to Individual Values</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch checked={playSoundOnFinish} onCheckedChange={setPlaySoundOnFinish} />
              <Label>Play Sound When Conversion Finishes</Label>
            </div>

            {playSoundOnFinish && (
              <div className="space-y-2">
                <Label>Volume: {playSoundVolume}%</Label>
                <Slider
                  value={[playSoundVolume]}
                  onValueChange={([v]) => setPlaySoundVolume(v)}
                  min={0}
                  max={100}
                  step={5}
                />
              </div>
            )}

            <Separator />

            <div className="space-y-3">
              <h4 className="text-sm font-medium">Theme</h4>
              <div className="space-y-2">
                <Label>Mode</Label>
                <div className="flex gap-2">
                  {Object.values(Theme).map((mode) => (
                    <Button
                      key={mode}
                      variant={currentTheme.display === mode ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setThemeMode(mode)}
                    >
                      {mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Color Theme</Label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_THEMES.map((theme) => (
                    <Button
                      key={theme.name}
                      variant={selectedTheme?.name === theme.name ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => selectTheme(theme)}
                    >
                      {theme.name}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {category === 'Conversion' && (
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Switch checked={jxlLossyModular} onCheckedChange={setJxlLossyModular} />
              <Label>JPEG XL - Allow Lossy Modular</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch checked={jxlAutoLossless} onCheckedChange={setJxlAutoLossless} />
              <Label>JPEG XL - Automatic Lossless JPEG Transcoding</Label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>JPEG Encoder</Label>
                <Select value={jpgEncoder} onValueChange={setJpgEncoder}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {JPEG_ENCODERS.map((e) => (
                      <SelectItem key={e} value={e}>
                        {e}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>AVIF Encoder</Label>
                <Select value={avifEncoder} onValueChange={setAvifEncoder}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AVIF_ENCODERS.map((e) => (
                      <SelectItem key={e} value={e}>
                        {e}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>AVIF - Bit Depth</Label>
              <Select value={avifBitDepth} onValueChange={setAvifBitDepth}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(avifEncoder === 'SVT-AV1-PSY' ? AVIF_BIT_DEPTH_SVT : AVIF_BIT_DEPTH_AOM).map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Switch checked={avifIqTune} onCheckedChange={setAvifIqTune} disabled={avifEncoder !== 'AOM AV1'} />
              <Label>AOM AV1 - Use IQ Tune</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch checked={disableProgressiveJpegli} onCheckedChange={setDisableProgressiveJpegli} />
              <Label>JPEGLI - Disable Progressive Scan</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch checked={keepIfLarger} onCheckedChange={setKeepIfLarger} />
              <Label>Do Not Delete Original When Result is Larger</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch checked={copyIfLarger} onCheckedChange={setCopyIfLarger} />
              <Label>Copy Original When Result is Larger</Label>
            </div>
          </div>
        )}

        {category === 'ExifTool' && (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>ExifTool - Wipe</Label>
              <Textarea value={exiftoolWipe} onChange={(e) => setExiftoolWipe(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>ExifTool - Preserve</Label>
              <Textarea value={exiftoolPreserve} onChange={(e) => setExiftoolPreserve(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>ExifTool - Unsafe Wipe</Label>
              <Textarea value={exiftoolUnsafe} onChange={(e) => setExiftoolUnsafe(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>ExifTool - Custom</Label>
              <Textarea value={exiftoolCustom} onChange={(e) => setExiftoolCustom(e.target.value)} />
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setExiftoolWipe('-m -all= -tagsFromFile @ -icc_profile:all -ColorSpace:all -Orientation $dst -overwrite_original');
                setExiftoolPreserve('-m -tagsFromFile $src $dst -overwrite_original');
                setExiftoolUnsafe('-m -all= $dst -overwrite_original');
              }}
            >
              Reset ExifTool Presets
            </Button>
          </div>
        )}

        {category === 'Advanced' && (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>RAM Optimizer</Label>
              <Select value={ramOptimizer} onValueChange={setRamOptimizer}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['Dynamic', 'Static', 'Disabled'].map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Optimization Rules</Label>
              <Textarea
                value={ramOptimizerRules}
                onChange={(e) => setRamOptimizerRules(e.target.value)}
                disabled={ramOptimizer !== 'Dynamic'}
              />
              <Button
                variant="outline"
                onClick={() => setRamOptimizerRules(DEFAULT_RAM_OPTIMIZER_RULES)}
                disabled={ramOptimizer !== 'Dynamic'}
              >
                Reset Rules
              </Button>
            </div>

            <div className="flex items-center space-x-2">
              <Switch checked={jxlEffort10} onCheckedChange={setJxlEffort10} />
              <Label>JPEG XL - Enable Effort 10</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch checked={jxlIntEffort} onCheckedChange={setJxlIntEffort} />
              <Label>JPEG XL - Allow Intelligent Effort (Deprecated)</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch checked={customResampling} onCheckedChange={setCustomResampling} />
              <Label>Downscaling - Custom Resampling</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch checked={enableCustomArgs} onCheckedChange={setEnableCustomArgs} />
              <Label>Additional Encoder Arguments</Label>
            </div>

            <div className="space-y-2">
              <Label>cjxl (JPEG XL)</Label>
              <Textarea value={cjxlArgs} onChange={(e) => setCjxlArgs(e.target.value)} disabled={!enableCustomArgs} />
            </div>
            <div className="space-y-2">
              <Label>avifenc (AVIF)</Label>
              <Textarea value={avifencArgs} onChange={(e) => setAvifencArgs(e.target.value)} disabled={!enableCustomArgs} />
            </div>
            <div className="space-y-2">
              <Label>cjpegli (JPEG)</Label>
              <Textarea value={cjpegliArgs} onChange={(e) => setCjpegliArgs(e.target.value)} disabled={!enableCustomArgs} />
            </div>
            <div className="space-y-2">
              <Label>ImageMagick (WebP/JPEG)</Label>
              <Textarea value={imArgs} onChange={(e) => setImArgs(e.target.value)} disabled={!enableCustomArgs} />
            </div>

            <div className="space-y-2">
              <Label>Logging</Label>
              <div className="flex flex-wrap gap-2">
                <Button variant={logging ? 'default' : 'outline'} onClick={toggleLogging}>
                  {logging ? 'Stop Logging' : 'Start Logging'}
                </Button>
                <Button variant="outline" onClick={openLogsDir}>Open Logs Folder</Button>
                <Button variant="outline" onClick={wipeLogsDir}>Wipe Logs Folder</Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
