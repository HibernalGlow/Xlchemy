import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/shadcn/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/shadcn/select';
import { Slider } from '~/components/shadcn/slider';
import { Switch } from '~/components/shadcn/switch';
import { Label } from '~/components/shadcn/label';
import { Input } from '~/components/shadcn/input';
import { Button } from '~/components/shadcn/button';
import { Separator } from '~/components/shadcn/separator';
import {
  OUTPUT_FORMATS,
  DUPLICATE_HANDLING,
  DELETE_MODES,
  JXL_NORMALIZE_WHEN,
} from '~/consts';
import type { GeneralSettings, OutputSettings } from '~/types';
import { getAPI } from '~/utils/api';
import { FolderOpen, RotateCcw } from 'lucide-react';

export interface OutputTabRef {
  getSettings: () => OutputSettings;
}

interface OutputTabProps {
  initialSettings: OutputSettings;
  settings: GeneralSettings;
  maxThreads: number;
  onSettingsChange?: (settings: OutputSettings) => void;
}

export const OutputTab = forwardRef<OutputTabRef, OutputTabProps>(function OutputTab({
  initialSettings,
  settings,
  maxThreads,
  onSettingsChange,
}, ref) {
  const [format, setFormat] = useState(initialSettings.format);
  const [quality, setQuality] = useState(initialSettings.quality);
  const [effort, setEffort] = useState(initialSettings.effort);
  const [lossless, setLossless] = useState(initialSettings.lossless);
  const [intelligentEffort, setIntelligentEffort] = useState(initialSettings.intelligent_effort);
  const [jxlModular, setJxlModular] = useState(initialSettings.jxl_modular);
  const [jxlVerify, setJxlVerify] = useState(initialSettings.jxl_verify);
  const [jxlNormalizeEnable, setJxlNormalizeEnable] = useState(initialSettings.jxl_normalize_enable);
  const [jxlNormalizeWhen, setJxlNormalizeWhen] = useState(initialSettings.jxl_normalize_when);
  const [maxCompression, setMaxCompression] = useState(initialSettings.max_compression);
  const [aomChroma, setAomChroma] = useState(initialSettings.aom_av1_chroma_subsampling);
  const [jpegliChroma, setJpegliChroma] = useState(initialSettings.jpegli_chroma_subsampling);
  const [jpgChroma, setJpgChroma] = useState(initialSettings.jpg_chroma_subsampling);
  const [ifFileExists, setIfFileExists] = useState(initialSettings.if_file_exists);
  const [customOutputDir, setCustomOutputDir] = useState(initialSettings.custom_output_dir);
  const [customOutputDirPath, setCustomOutputDirPath] = useState(initialSettings.custom_output_dir_path);
  const [keepDirStruct, setKeepDirStruct] = useState(initialSettings.keep_dir_struct);
  const [deleteOriginal, setDeleteOriginal] = useState(initialSettings.delete_original);
  const [deleteOriginalMode, setDeleteOriginalMode] = useState(initialSettings.delete_original_mode);
  const [threadCount, setThreadCount] = useState(initialSettings.thread_count);
  const [smallestPool, setSmallestPool] = useState(initialSettings.smallest_format_pool);
  const [jxlPngFallback, setJxlPngFallback] = useState(initialSettings.jxl_png_fallback);
  const [clearAfterConv, setClearAfterConv] = useState(initialSettings.clear_after_conv);

  useEffect(() => {
    setFormat(initialSettings.format);
    setQuality(initialSettings.quality);
    setEffort(initialSettings.effort);
    setLossless(initialSettings.lossless);
    setIntelligentEffort(initialSettings.intelligent_effort);
    setJxlModular(initialSettings.jxl_modular);
    setJxlVerify(initialSettings.jxl_verify);
    setJxlNormalizeEnable(initialSettings.jxl_normalize_enable);
    setJxlNormalizeWhen(initialSettings.jxl_normalize_when);
    setMaxCompression(initialSettings.max_compression);
    setAomChroma(initialSettings.aom_av1_chroma_subsampling);
    setJpegliChroma(initialSettings.jpegli_chroma_subsampling);
    setJpgChroma(initialSettings.jpg_chroma_subsampling);
    setIfFileExists(initialSettings.if_file_exists);
    setCustomOutputDir(initialSettings.custom_output_dir);
    setCustomOutputDirPath(initialSettings.custom_output_dir_path);
    setKeepDirStruct(initialSettings.keep_dir_struct);
    setDeleteOriginal(initialSettings.delete_original);
    setDeleteOriginalMode(initialSettings.delete_original_mode);
    setThreadCount(initialSettings.thread_count);
    setSmallestPool(initialSettings.smallest_format_pool);
    setJxlPngFallback(initialSettings.jxl_png_fallback);
    setClearAfterConv(initialSettings.clear_after_conv);
  }, [initialSettings]);

  useEffect(() => {
    if (!settings.jxl_lossy_modular) {
      setJxlModular(false);
    }
  }, [settings.jxl_lossy_modular]);

  useEffect(() => {
    if (!settings.jxl_int_effort) {
      setIntelligentEffort(false);
    }
  }, [settings.jxl_int_effort]);

  useEffect(() => {
    if (!customOutputDir) {
      setKeepDirStruct(false);
    }
  }, [customOutputDir]);

  useEffect(() => {
    if (threadCount > maxThreads) {
      setThreadCount(maxThreads);
    }
  }, [threadCount, maxThreads]);

  const { effortLabel, effortMin, effortMax } = useMemo(() => {
    if (format === 'AVIF') return { effortLabel: 'Speed', effortMin: 0, effortMax: 10 };
    if (format === 'WebP') return { effortLabel: 'Method', effortMin: 0, effortMax: 6 };
    if (format === 'Lossless JPEG Transcoding') return { effortLabel: 'Effort', effortMin: 1, effortMax: settings.enable_jxl_effort_10 ? 10 : 9 };
    if (format === 'JPEG XL') return { effortLabel: 'Effort', effortMin: 1, effortMax: settings.enable_jxl_effort_10 ? 10 : 9 };
    return { effortLabel: 'Effort', effortMin: 1, effortMax: 10 };
  }, [format, settings.enable_jxl_effort_10]);

  const { qualityMin, qualityMax } = useMemo(() => {
    if (format === 'JPEG XL' || format === 'AVIF') return { qualityMin: 0, qualityMax: 99 };
    if (format === 'WebP') return { qualityMin: 1, qualityMax: 99 };
    return { qualityMin: 1, qualityMax: 100 };
  }, [format]);

  useEffect(() => {
    if (effort < effortMin) setEffort(effortMin);
    if (effort > effortMax) setEffort(effortMax);
  }, [effort, effortMin, effortMax]);

  useEffect(() => {
    if (quality < qualityMin) setQuality(qualityMin);
    if (quality > qualityMax) setQuality(qualityMax);
  }, [quality, qualityMin, qualityMax]);

  useEffect(() => {
    if (lossless) {
      setJxlModular(false);
    }
  }, [lossless]);

  const handleBrowseOutputDir = useCallback(async () => {
    const api = getAPI();
    if (!api) return;
    const dir = await api.openFolderDialog();
    if (dir) {
      setCustomOutputDirPath(dir);
    }
  }, []);

  const settingsPayload = useMemo<OutputSettings>(() => ({
    format,
    quality,
    effort,
    lossless,
    intelligent_effort: intelligentEffort,
    jxl_modular: jxlModular,
    jxl_verify: jxlVerify,
    jxl_normalize_enable: jxlNormalizeEnable,
    jxl_normalize_when: jxlNormalizeWhen,
    max_compression: maxCompression,
    aom_av1_chroma_subsampling: aomChroma,
    jpegli_chroma_subsampling: jpegliChroma,
    jpg_chroma_subsampling: jpgChroma,
    if_file_exists: ifFileExists,
    custom_output_dir: customOutputDir,
    custom_output_dir_path: customOutputDirPath,
    keep_dir_struct: keepDirStruct,
    delete_original: deleteOriginal,
    delete_original_mode: deleteOriginalMode,
    smallest_format_pool: smallestPool,
    jxl_png_fallback: jxlPngFallback,
    thread_count: threadCount,
    clear_after_conv: clearAfterConv,
  }), [
    format,
    quality,
    effort,
    lossless,
    intelligentEffort,
    jxlModular,
    jxlVerify,
    jxlNormalizeEnable,
    jxlNormalizeWhen,
    maxCompression,
    aomChroma,
    jpegliChroma,
    jpgChroma,
    ifFileExists,
    customOutputDir,
    customOutputDirPath,
    keepDirStruct,
    deleteOriginal,
    deleteOriginalMode,
    smallestPool,
    jxlPngFallback,
    threadCount,
    clearAfterConv,
  ]);

  useEffect(() => {
    onSettingsChange?.(settingsPayload);
  }, [settingsPayload, onSettingsChange]);

  useImperativeHandle(ref, () => ({
    getSettings: () => settingsPayload,
  }));

  const showQuality = ['JPEG XL', 'AVIF', 'WebP', 'JPEG'].includes(format);
  const showEffort = ['JPEG XL', 'AVIF', 'WebP', 'Lossless JPEG Transcoding'].includes(format);
  const showLossless = ['JPEG XL', 'WebP'].includes(format);
  const showJxlModular = format === 'JPEG XL' && settings.jxl_lossy_modular;
  const showIntEffort = format === 'JPEG XL' && settings.jxl_int_effort;
  const showSmallestLossless = format === 'Smallest Lossless';
  const showJxlNormalize = format === 'Lossless JPEG Transcoding';
  const showJxlPngFallback = format === 'JPEG Reconstruction';
  const showChromaJpeg = format === 'JPEG' && settings.jpg_encoder === 'libjpeg';
  const showChromaJpegli = format === 'JPEG' && settings.jpg_encoder === 'JPEGLI';
  const showChromaAvif = format === 'AVIF' && settings.avif_encoder === 'AOM AV1';
  const showChromaAvifFixed = format === 'AVIF' && settings.avif_encoder === 'SVT-AV1-PSY';

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Output Settings</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setFormat('JPEG XL');
              setQuality(80);
              setEffort(7);
              setLossless(false);
              setIntelligentEffort(false);
              setJxlModular(false);
              setJxlVerify(false);
              setJxlNormalizeEnable(false);
              setJxlNormalizeWhen('On Fail');
              setMaxCompression(false);
              setAomChroma('Default');
              setJpegliChroma('Default');
              setJpgChroma('Default');
              setIfFileExists('Rename');
              setCustomOutputDir(false);
              setCustomOutputDirPath('');
              setKeepDirStruct(false);
              setDeleteOriginal(false);
              setDeleteOriginalMode('To Trash');
              setSmallestPool({ png: true, webp: true, jxl: true });
              setJxlPngFallback(false);
              setThreadCount(Math.max(maxThreads - 1, 1));
              setClearAfterConv(false);
            }}
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            Defaults
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Format / Mode</Label>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OUTPUT_FORMATS.map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Threads: {threadCount}</Label>
            <Slider
              value={[threadCount]}
              onValueChange={([v]) => setThreadCount(v)}
              min={1}
              max={Math.max(maxThreads, 1)}
              step={1}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>If Output Exists</Label>
            <Select value={ifFileExists} onValueChange={setIfFileExists}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DUPLICATE_HANDLING.map((mode) => (
                  <SelectItem key={mode} value={mode}>
                    {mode}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Delete Original</Label>
            <div className="flex items-center gap-2">
              <Switch checked={deleteOriginal} onCheckedChange={setDeleteOriginal} />
              <Select value={deleteOriginalMode} onValueChange={setDeleteOriginalMode} disabled={!deleteOriginal}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DELETE_MODES.map((mode) => (
                    <SelectItem key={mode} value={mode}>
                      {mode}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Separator />

        {showQuality && !lossless && (
          <div className="space-y-2">
            <Label>Quality: {quality}</Label>
            <Slider
              value={[quality]}
              onValueChange={([v]) => setQuality(v)}
              min={qualityMin}
              max={qualityMax}
              step={settings.enable_quality_precision_snapping ? 1 : 5}
            />
          </div>
        )}

        {showEffort && (
          <div className="space-y-2">
            <Label>{effortLabel}: {effort}</Label>
            <Slider
              value={[effort]}
              onValueChange={([v]) => setEffort(v)}
              min={effortMin}
              max={effortMax}
              step={1}
              disabled={showIntEffort && intelligentEffort}
            />
          </div>
        )}

        {showLossless && (
          <div className="flex items-center space-x-2">
            <Switch checked={lossless} onCheckedChange={setLossless} />
            <Label>Lossless</Label>
          </div>
        )}

        {showIntEffort && (
          <div className="flex items-center space-x-2">
            <Switch checked={intelligentEffort} onCheckedChange={setIntelligentEffort} />
            <Label>Intelligent Effort</Label>
          </div>
        )}

        {showJxlModular && (
          <div className="flex items-center space-x-2">
            <Switch checked={jxlModular} onCheckedChange={setJxlModular} disabled={lossless} />
            <Label>Lossy Modular</Label>
          </div>
        )}

        {(showChromaJpeg || showChromaJpegli || showChromaAvif || showChromaAvifFixed) && (
          <div className="space-y-2">
            <Label>Chroma Subsampling</Label>
            {showChromaJpeg && (
              <Select value={jpgChroma} onValueChange={setJpgChroma}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['Default', '4:4:4', '4:2:2', '4:2:0'].map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {showChromaJpegli && (
              <Select value={jpegliChroma} onValueChange={setJpegliChroma}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['Default', '4:4:4', '4:2:2', '4:2:0'].map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {showChromaAvif && (
              <Select value={aomChroma} onValueChange={setAomChroma}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['Default', '4:4:4', '4:2:2', '4:2:0', '4:0:0'].map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {showChromaAvifFixed && (
              <Select value="4:2:0" disabled>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4:2:0">4:2:0</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        )}

        {showJxlNormalize && (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Switch checked={jxlNormalizeEnable} onCheckedChange={setJxlNormalizeEnable} />
              <Label>Normalize</Label>
            </div>
            <Select
              value={jxlNormalizeWhen}
              onValueChange={setJxlNormalizeWhen}
              disabled={!jxlNormalizeEnable}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {JXL_NORMALIZE_WHEN.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center space-x-2">
              <Switch checked={jxlVerify} onCheckedChange={setJxlVerify} />
              <Label>Verify</Label>
            </div>
          </div>
        )}

        {showJxlPngFallback && (
          <div className="flex items-center space-x-2">
            <Switch checked={jxlPngFallback} onCheckedChange={setJxlPngFallback} />
            <Label>PNG Fallback</Label>
          </div>
        )}

        {showSmallestLossless && (
          <div className="space-y-2">
            <Label>Smallest Lossless Pool</Label>
            <div className="flex items-center gap-3 text-sm">
              <label className="flex items-center gap-2">
                <Switch
                  checked={smallestPool.png}
                  onCheckedChange={(value) => setSmallestPool((prev) => ({ ...prev, png: value }))}
                />
                PNG (Oxipng)
              </label>
              <label className="flex items-center gap-2">
                <Switch
                  checked={smallestPool.webp}
                  onCheckedChange={(value) => setSmallestPool((prev) => ({ ...prev, webp: value }))}
                />
                WebP
              </label>
              <label className="flex items-center gap-2">
                <Switch
                  checked={smallestPool.jxl}
                  onCheckedChange={(value) => setSmallestPool((prev) => ({ ...prev, jxl: value }))}
                />
                JPEG XL
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch checked={maxCompression} onCheckedChange={setMaxCompression} />
              <Label>Max Compression</Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Max Bit Depth: {smallestPool.webp ? '8-bit' : '16-bit'}
            </p>
          </div>
        )}

        <Separator />

        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Switch checked={customOutputDir} onCheckedChange={setCustomOutputDir} />
            <Label>Custom Output Directory</Label>
          </div>
          {customOutputDir && (
            <div className="flex gap-2">
              <Input
                value={customOutputDirPath}
                onChange={(e) => setCustomOutputDirPath(e.target.value)}
                placeholder="Output directory path"
              />
              <Button variant="outline" size="icon" onClick={handleBrowseOutputDir}>
                <FolderOpen className="h-4 w-4" />
              </Button>
            </div>
          )}
          <div className="flex items-center space-x-2">
            <Switch checked={keepDirStruct} onCheckedChange={setKeepDirStruct} disabled={!customOutputDir} />
            <Label>Keep Folder Structure</Label>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Switch checked={clearAfterConv} onCheckedChange={setClearAfterConv} />
          <Label>Clear File List After Conversion</Label>
        </div>
      </CardContent>
    </Card>
  );
});
