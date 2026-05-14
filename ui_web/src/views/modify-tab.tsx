import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/shadcn/card';
import { Switch } from '~/components/shadcn/switch';
import { Label } from '~/components/shadcn/label';
import { Slider } from '~/components/shadcn/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/shadcn/select';
import { Separator } from '~/components/shadcn/separator';
import { METADATA_MODES, RESAMPLING_METHODS } from '~/consts';

export function ModifyTab() {
  const [downscaleEnabled, setDownscaleEnabled] = useState(false);
  const [downscaleWidth, setDownscaleWidth] = useState(1920);
  const [downscaleHeight, setDownscaleHeight] = useState(1080);
  const [keepAspectRatio, setKeepAspectRatio] = useState(true);
  const [resampling, setResampling] = useState('Lanczos');
  const [keepMetadata, setKeepMetadata] = useState('None');
  const [keepDates, setKeepDates] = useState(true);
  const [preserveOrientation, setPreserveOrientation] = useState(true);

  const getSettings = () => ({
    downscale: {
      enabled: downscaleEnabled,
      width: downscaleWidth,
      height: downscaleHeight,
      keep_aspect_ratio: keepAspectRatio,
      resampling,
    },
    misc: {
      keep_metadata: keepMetadata,
      keep_dates: keepDates,
      preserve_orientation: preserveOrientation,
    },
  });

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Modify Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Switch checked={downscaleEnabled} onCheckedChange={setDownscaleEnabled} />
            <Label>Downscale</Label>
          </div>

          {downscaleEnabled && (
            <div className="space-y-3 pl-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Width: {downscaleWidth}px</Label>
                  <Slider
                    value={[downscaleWidth]}
                    onValueChange={([v]) => setDownscaleWidth(v)}
                    min={1}
                    max={7680}
                    step={1}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Height: {downscaleHeight}px</Label>
                  <Slider
                    value={[downscaleHeight]}
                    onValueChange={([v]) => setDownscaleHeight(v)}
                    min={1}
                    max={4320}
                    step={1}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch checked={keepAspectRatio} onCheckedChange={setKeepAspectRatio} />
                <Label>Keep Aspect Ratio</Label>
              </div>

              <div className="space-y-2">
                <Label>Resampling</Label>
                <Select value={resampling} onValueChange={setResampling}>
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
            <Label>Keep Metadata</Label>
            <Select value={keepMetadata} onValueChange={setKeepMetadata}>
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
            <Switch checked={keepDates} onCheckedChange={setKeepDates} />
            <Label>Keep Dates</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch checked={preserveOrientation} onCheckedChange={setPreserveOrientation} />
            <Label>Preserve Orientation</Label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
