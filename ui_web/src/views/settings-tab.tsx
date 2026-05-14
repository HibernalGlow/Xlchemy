import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/shadcn/card';
import { Switch } from '~/components/shadcn/switch';
import { Label } from '~/components/shadcn/label';
import { Slider } from '~/components/shadcn/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/shadcn/select';
import { Separator } from '~/components/shadcn/separator';
import { Button } from '~/components/shadcn/button';
import { PRESET_THEMES } from '~/utils/themeManager';
import { useSetAtom } from 'jotai';
import { selectThemeAtom, setThemeModeAtom } from '~/atom/theme';
import { useAtomValue } from 'jotai';
import { selectedThemeAtom, themeAtom } from '~/atom/primitive';
import { PROCESSING_ORDERS, JPEG_ENCODERS, AVIF_ENCODERS } from '~/consts';
import { Theme } from '~/consts';

export function SettingsTab() {
  const [processingOrder, setProcessingOrder] = useState('Sequential');
  const [playSoundOnFinish, setPlaySoundOnFinish] = useState(true);
  const [playSoundVolume, setPlaySoundVolume] = useState(80);
  const [jpgEncoder, setJpgEncoder] = useState('libjpeg-turbo');
  const [avifEncoder, setAvifEncoder] = useState('libavif (aom)');

  const selectTheme = useSetAtom(selectThemeAtom);
  const setThemeMode = useSetAtom(setThemeModeAtom);
  const currentTheme = useAtomValue(themeAtom);
  const selectedTheme = useAtomValue(selectedThemeAtom);

  const getSettings = () => ({
    processing_order: processingOrder,
    play_sound_on_finish: playSoundOnFinish,
    play_sound_on_finish_vol: playSoundVolume,
    ram_optimizer: 'Auto',
    ram_optimizer_rules: '',
    jpg_encoder: jpgEncoder,
    avif_encoder: avifEncoder,
    custom_resampling: false,
    quality_prec_snap: false,
    jxl_effort_10: false,
    jxl_lossy_modular: false,
    jxl_int_effort: false,
    exiftool_args: {},
  });

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <h4 className="text-sm font-medium">General</h4>
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
            <Switch checked={playSoundOnFinish} onCheckedChange={setPlaySoundOnFinish} />
            <Label>Play Sound on Finish</Label>
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
        </div>

        <Separator />

        <div className="space-y-3">
          <h4 className="text-sm font-medium">Conversion</h4>
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
        </div>

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
      </CardContent>
    </Card>
  );
}
