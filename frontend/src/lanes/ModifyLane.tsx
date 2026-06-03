import * as React from 'react';
import { useAppState } from '~/hooks/useAppState';
import { useT } from '~/hooks/useT';
import { LaneCard } from '~/components/canvas/LaneCard';
import { Checkbox } from '~/components/ui/Checkbox';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '~/components/ui/Select';
import { Input } from '~/components/ui/Input';

export function ModifyLane() {
  const t = useT();
  const { modifySettings, updateModify } = useAppState();

  const ds = modifySettings.downscaling || {};
  const misc = modifySettings.misc || {};

  return (
    <>
      {/* Downscaling Card */}
      <LaneCard id="modify-downscaling" header={t('Downscaling')}>
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <Checkbox
              id="enable_downscaling"
              checked={!!ds.enabled}
              onCheckedChange={(v) => updateModify(['downscaling', 'enabled'], !!v)}
            />
            <label htmlFor="enable_downscaling" className="text-[11px] text-text-1 cursor-pointer">
              {t('Enable downscaling')}
            </label>
          </div>

          {ds.enabled && (
            <>
              <div className="flex gap-2 items-center">
                <span className="text-[11px] text-text-2 shrink-0">{t('Mode:')}</span>
                <Select
                  value={ds.mode || 'Resolution'}
                  onValueChange={(v) => updateModify(['downscaling', 'mode'], v)}
                >
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['Resolution', 'Percent', 'File Size', 'Shortest Side', 'Longest Side', 'Megapixels'].map((opt) => (
                      <SelectItem key={opt} value={opt}>{t(opt)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {ds.mode === 'Resolution' && (
                <div className="flex gap-2 items-center">
                  <span className="text-[11px] text-text-2">{t('Width:')}</span>
                  <Input
                    type="number"
                    className="w-20 h-7 text-center"
                    value={ds.width || 1920}
                    onChange={(e) => updateModify(['downscaling', 'width'], Number(e.target.value))}
                  />
                  <span className="text-[11px] text-text-2">{t('Height:')}</span>
                  <Input
                    type="number"
                    className="w-20 h-7 text-center"
                    value={ds.height || 1080}
                    onChange={(e) => updateModify(['downscaling', 'height'], Number(e.target.value))}
                  />
                </div>
              )}

              {ds.mode === 'Percent' && (
                <div className="flex gap-2 items-center">
                  <span className="text-[11px] text-text-2">{t('Percent:')}</span>
                  <Input
                    type="number"
                    className="w-20 h-7 text-center"
                    value={ds.percent || 50}
                    min={1}
                    max={100}
                    onChange={(e) => updateModify(['downscaling', 'percent'], Number(e.target.value))}
                  />
                </div>
              )}

              {ds.mode === 'Megapixels' && (
                <div className="flex gap-2 items-center">
                  <span className="text-[11px] text-text-2">{t('Megapixels:')}</span>
                  <Input
                    type="number"
                    className="w-20 h-7 text-center"
                    value={ds.megapixels || 2}
                    min={0.1}
                    step={0.1}
                    onChange={(e) => updateModify(['downscaling', 'megapixels'], Number(e.target.value))}
                  />
                </div>
              )}

              <div className="flex gap-2 items-center">
                <span className="text-[11px] text-text-2 shrink-0">{t('Resample:')}</span>
                <Select
                  value={ds.resample || 'Default'}
                  onValueChange={(v) => updateModify(['downscaling', 'resample'], v)}
                >
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['Default', 'Nearest', 'Bilinear', 'Bicubic', 'Mitchell', 'Lanczos', 'Catrom', 'Spline'].map((opt) => (
                      <SelectItem key={opt} value={opt}>{t(opt)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>
      </LaneCard>

      {/* Misc Card */}
      <LaneCard id="modify-misc" header={t('Misc')}>
        <div className="flex flex-col gap-2.5">
          <div className="flex gap-2 items-center">
            <span className="text-[11px] text-text-2 shrink-0">{t('Metadata:')}</span>
            <Select
              value={misc.keep_metadata || 'Encoder - Wipe'}
              onValueChange={(v) => updateModify(['misc', 'keep_metadata'], v)}
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['Encoder - Wipe', 'Encoder - Preserve', 'ExifTool - Wipe', 'ExifTool - Preserve', 'ExifTool - Unsafe Wipe', 'ExifTool - Custom'].map((opt) => (
                  <SelectItem key={opt} value={opt}>{t(opt)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="keep_timestamps"
              checked={!!misc.keep_timestamps}
              onCheckedChange={(v) => updateModify(['misc', 'keep_timestamps'], !!v)}
            />
            <label htmlFor="keep_timestamps" className="text-[11px] text-text-1 cursor-pointer">
              {t('Keep timestamps')}
            </label>
          </div>
        </div>
      </LaneCard>
    </>
  );
}
