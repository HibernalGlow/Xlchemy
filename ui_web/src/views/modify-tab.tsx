import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/shadcn/card';
import { Switch } from '~/components/shadcn/switch';
import { Label } from '~/components/shadcn/label';
import { Slider } from '~/components/shadcn/slider';
import { Input } from '~/components/shadcn/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/shadcn/select';
import { Separator } from '~/components/shadcn/separator';
import { METADATA_MODES, RESAMPLING_METHODS } from '~/consts';
import type { ModifySettings } from '~/types';
import { clamp } from '~/utils/numbers';

export interface ModifyTabRef {
  getSettings: () => ModifySettings;
}

interface ModifyTabProps {
  initialSettings: ModifySettings;
  fileFormat: string;
  customResamplingEnabled: boolean;
  onSettingsChange?: (settings: ModifySettings) => void;
}

export const ModifyTab = forwardRef<ModifyTabRef, ModifyTabProps>(function ModifyTab({
  initialSettings,
  fileFormat,
  customResamplingEnabled,
  onSettingsChange,
}, ref) {
  const [downscaleEnabled, setDownscaleEnabled] = useState(initialSettings.downscaling.enabled);
  const [mode, setMode] = useState(initialSettings.downscaling.mode);
  const [percent, setPercent] = useState(initialSettings.downscaling.percent);
  const [width, setWidth] = useState(initialSettings.downscaling.width);
  const [height, setHeight] = useState(initialSettings.downscaling.height);
  const [fileSize, setFileSize] = useState(initialSettings.downscaling.file_size);
  const [shortestSide, setShortestSide] = useState(initialSettings.downscaling.shortest_side);
  const [longestSide, setLongestSide] = useState(initialSettings.downscaling.longest_side);
  const [megapixels, setMegapixels] = useState(initialSettings.downscaling.megapixels);
  const [resample, setResample] = useState(initialSettings.downscaling.resample);
  const [keepMetadata, setKeepMetadata] = useState(initialSettings.misc.keep_metadata);
  const [keepTimestamps, setKeepTimestamps] = useState(initialSettings.misc.keep_timestamps);

  useEffect(() => {
    setDownscaleEnabled(initialSettings.downscaling.enabled);
    setMode(initialSettings.downscaling.mode);
    setPercent(initialSettings.downscaling.percent);
    setWidth(initialSettings.downscaling.width);
    setHeight(initialSettings.downscaling.height);
    setFileSize(initialSettings.downscaling.file_size);
    setShortestSide(initialSettings.downscaling.shortest_side);
    setLongestSide(initialSettings.downscaling.longest_side);
    setMegapixels(initialSettings.downscaling.megapixels);
    setResample(initialSettings.downscaling.resample);
    setKeepMetadata(initialSettings.misc.keep_metadata);
    setKeepTimestamps(initialSettings.misc.keep_timestamps);
  }, [initialSettings]);

  const downscalingAllowed = !['Lossless JPEG Transcoding', 'JPEG Reconstruction', 'Smallest Lossless'].includes(fileFormat);
  const metadataAllowed = !['Lossless JPEG Transcoding', 'JPEG Reconstruction'].includes(fileFormat);

  useEffect(() => {
    if (!downscalingAllowed) {
      setDownscaleEnabled(false);
    }
  }, [downscalingAllowed]);

  useEffect(() => {
    if (!metadataAllowed) {
      setKeepMetadata('Encoder - Wipe');
    }
  }, [metadataAllowed]);

  const settingsPayload = useMemo<ModifySettings>(() => ({
    downscaling: {
      enabled: downscalingAllowed && downscaleEnabled,
      mode,
      percent,
      width: mode === 'Resolution' ? width : width,
      height: mode === 'Resolution' ? height : height,
      file_size: fileSize,
      shortest_side: shortestSide,
      longest_side: longestSide,
      megapixels,
      resample: customResamplingEnabled ? resample : 'Default',
    },
    misc: {
      keep_metadata: metadataAllowed ? keepMetadata : 'Encoder - Wipe',
      keep_timestamps: keepTimestamps,
    },
  }), [
    downscalingAllowed,
    downscaleEnabled,
    mode,
    percent,
    width,
    height,
    fileSize,
    shortestSide,
    longestSide,
    megapixels,
    resample,
    customResamplingEnabled,
    keepMetadata,
    keepTimestamps,
    metadataAllowed,
  ]);

  useEffect(() => {
    onSettingsChange?.(settingsPayload);
  }, [settingsPayload, onSettingsChange]);

  useImperativeHandle(ref, () => ({
    getSettings: () => settingsPayload,
  }));

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Modify Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Switch checked={downscaleEnabled} onCheckedChange={setDownscaleEnabled} disabled={!downscalingAllowed} />
            <Label>Downscale</Label>
          </div>

          {downscaleEnabled && downscalingAllowed && (
            <div className="space-y-3 pl-4">
              <div className="space-y-2">
                <Label>Mode</Label>
                <Select value={mode} onValueChange={setMode}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['Resolution', 'Megapixels', 'Percent', 'Shortest Side', 'Longest Side', 'File Size'].map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {mode === 'Resolution' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Width (px)</Label>
                    <Input
                      type="number"
                      value={width}
                      onChange={(e) => setWidth(clamp(Number(e.target.value), 1, 999999999))}
                      min={1}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Height (px)</Label>
                    <Input
                      type="number"
                      value={height}
                      onChange={(e) => setHeight(clamp(Number(e.target.value), 1, 999999999))}
                      min={1}
                    />
                  </div>
                </div>
              )}

              {mode === 'Percent' && (
                <div className="space-y-2">
                  <Label>Percent: {percent}%</Label>
                  <Slider
                    value={[percent]}
                    onValueChange={([v]) => setPercent(v)}
                    min={1}
                    max={99}
                    step={1}
                  />
                </div>
              )}

              {mode === 'File Size' && (
                <div className="space-y-2">
                  <Label>File Size (KiB)</Label>
                  <Input
                    type="number"
                    value={fileSize}
                    onChange={(e) => setFileSize(clamp(Number(e.target.value), 1, 1048576))}
                    min={1}
                  />
                </div>
              )}

              {mode === 'Shortest Side' && (
                <div className="space-y-2">
                  <Label>Shortest Side (px)</Label>
                  <Input
                    type="number"
                    value={shortestSide}
                    onChange={(e) => setShortestSide(clamp(Number(e.target.value), 1, 999999999))}
                    min={1}
                  />
                </div>
              )}

              {mode === 'Longest Side' && (
                <div className="space-y-2">
                  <Label>Longest Side (px)</Label>
                  <Input
                    type="number"
                    value={longestSide}
                    onChange={(e) => setLongestSide(clamp(Number(e.target.value), 1, 999999999))}
                    min={1}
                  />
                </div>
              )}

              {mode === 'Megapixels' && (
                <div className="space-y-2">
                  <Label>Megapixels</Label>
                  <Input
                    type="number"
                    value={megapixels}
                    onChange={(e) => setMegapixels(clamp(Number(e.target.value), 0.01, 9999999))}
                    min={0.01}
                    step={0.01}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Resampling</Label>
                <Select value={resample} onValueChange={setResample} disabled={!customResamplingEnabled}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RESAMPLING_METHODS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Metadata</Label>
            <Select value={keepMetadata} onValueChange={setKeepMetadata} disabled={!metadataAllowed}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METADATA_MODES.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Switch checked={keepTimestamps} onCheckedChange={setKeepTimestamps} />
            <Label>Preserve Time Attributes</Label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
