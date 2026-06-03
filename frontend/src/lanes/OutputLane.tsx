import * as React from 'react';
import { useAppState } from '~/hooks/useAppState';
import { useT } from '~/hooks/useT';
import { LaneCard } from '~/components/canvas/LaneCard';
import { Checkbox } from '~/components/ui/Checkbox';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '~/components/ui/Select';
import { NumberInput } from '~/components/ui/NumberInput';
import { Input } from '~/components/ui/Input';

const formatOptions = [
  'JPEG XL', 'AVIF', 'JPEG', 'WebP', 'PNG',
  'Lossless JPEG Transcoding', 'JPEG Reconstruction', 'Smallest Lossless',
];

export function OutputLane() {
  const t = useT();
  const { outputSettings, updateOutput, cpuCount } = useAppState();

  const fmt = outputSettings.format || '';
  const isJxl = fmt === 'JPEG XL';
  const isAvif = fmt === 'AVIF';
  const isWebp = fmt === 'WebP';
  const isJpeg = fmt === 'JPEG';
  const isSmallestLossless = fmt === 'Smallest Lossless';
  const supportsLossless = isJxl || isAvif || isWebp;
  const supportsQuality = !outputSettings.lossless && (isJxl || isAvif || isJpeg || isWebp);
  const supportsEffort = supportsLossless && !outputSettings.lossless;

  return (
    <>
      {/* Format Card */}
      <LaneCard id="output-format" header={t('Format')}>
        <div className="flex flex-col gap-2.5">
          <div className="flex gap-2 items-center">
            <span className="text-[11px] text-text-2 shrink-0">{t('Format:')}</span>
            <Select value={fmt} onValueChange={(v) => updateOutput('format', v)}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder={t('Select format')} />
              </SelectTrigger>
              <SelectContent>
                {formatOptions.map((opt) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {supportsLossless && (
            <div className="flex items-center gap-2">
              <Checkbox id="lossless" checked={!!outputSettings.lossless} onCheckedChange={(v) => updateOutput('lossless', !!v)} />
              <label htmlFor="lossless" className="text-[11px] text-text-1 cursor-pointer">{t('Lossless')}</label>
            </div>
          )}

          {supportsQuality && (
            <NumberInput label={`${t('Quality:')}`} value={outputSettings.quality || 80} onChange={(v) => updateOutput('quality', v)} min={1} max={100} />
          )}

          {supportsEffort && (
            <NumberInput label={`${t('Effort:')}`} value={outputSettings.effort || 5} onChange={(v) => updateOutput('effort', v)} min={1} max={9} />
          )}

          {isJxl && !outputSettings.lossless && (
            <div className="flex items-center gap-2">
              <Checkbox id="jxl_modular" checked={!!outputSettings.jxl_modular} onCheckedChange={(v) => updateOutput('jxl_modular', !!v)} />
              <label htmlFor="jxl_modular" className="text-[11px] text-text-1 cursor-pointer">{t('JXL lossy modular')}</label>
            </div>
          )}

          {isJxl && (
            <>
              <div className="flex items-center gap-2">
                <Checkbox id="jxl_png_fallback" checked={!!outputSettings.jxl_png_fallback} onCheckedChange={(v) => updateOutput('jxl_png_fallback', !!v)} />
                <label htmlFor="jxl_png_fallback" className="text-[11px] text-text-1 cursor-pointer">{t('PNG fallback')}</label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="jxl_verify" checked={!!outputSettings.jxl_verify} onCheckedChange={(v) => updateOutput('jxl_verify', !!v)} />
                <label htmlFor="jxl_verify" className="text-[11px] text-text-1 cursor-pointer">{t('Verify')}</label>
              </div>
              <div className="flex items-center gap-3">
                <Checkbox id="jxl_normalize_enable" checked={!!outputSettings.jxl_normalize_enable} onCheckedChange={(v) => updateOutput('jxl_normalize_enable', !!v)} />
                <label htmlFor="jxl_normalize_enable" className="text-[11px] text-text-1 cursor-pointer">{t('Normalize')}</label>
                {outputSettings.jxl_normalize_enable && (
                  <Select value={outputSettings.jxl_normalize_when || 'On Fail'} onValueChange={(v) => updateOutput('jxl_normalize_when', v)}>
                    <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['On Fail', 'Always'].map((opt) => <SelectItem key={opt} value={opt}>{t(opt)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </>
          )}

          {supportsEffort && (
            <div className="flex items-center gap-2">
              <Checkbox id="intelligent_effort" checked={!!outputSettings.intelligent_effort} onCheckedChange={(v) => updateOutput('intelligent_effort', !!v)} />
              <label htmlFor="intelligent_effort" className="text-[11px] text-text-1 cursor-pointer">{t('Intelligent effort')}</label>
            </div>
          )}

          {isSmallestLossless && (
            <>
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-text-2">{t('Format pool:')}</span>
                {['png', 'webp', 'jxl'].map((f) => (
                  <div key={f} className="flex items-center gap-1.5">
                    <Checkbox id={`smallest_${f}`} checked={!!outputSettings.smallest_format_pool?.[f]} onCheckedChange={(v) => updateOutput('smallest_format_pool', { ...outputSettings.smallest_format_pool, [f]: !!v })} />
                    <label htmlFor={`smallest_${f}`} className="text-[11px] text-text-1 cursor-pointer">{f.toUpperCase()}</label>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="max_compression" checked={!!outputSettings.max_compression} onCheckedChange={(v) => updateOutput('max_compression', !!v)} />
                <label htmlFor="max_compression" className="text-[11px] text-text-1 cursor-pointer">{t('Max compression')}</label>
              </div>
            </>
          )}
        </div>
      </LaneCard>

      {/* Conversion Settings Card */}
      <LaneCard id="output-conversion" header={t('Conversion Settings')}>
        <div className="flex flex-col gap-2.5">
          <NumberInput label={`${t('Threads:')}`} value={outputSettings.threads || cpuCount} onChange={(v) => updateOutput('threads', v)} min={1} max={cpuCount} />
          <div className="flex gap-2 items-center">
            <span className="text-[11px] text-text-2 shrink-0">{t('If file exists:')}</span>
            <Select value={outputSettings.if_file_exists || 'Replace'} onValueChange={(v) => updateOutput('if_file_exists', v)}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['Replace', 'Skip', 'Rename'].map((opt) => <SelectItem key={opt} value={opt}>{t(opt)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </LaneCard>

      {/* Save To Card */}
      <LaneCard id="output-saveto" header={t('Save To')}>
        <div className="flex flex-col gap-2.5">
          <div className="flex gap-3 items-center">
            <label className="flex items-center gap-1.5 text-[11px] text-text-1 cursor-pointer">
              <input type="radio" name="output_dir" checked={!outputSettings.custom_output_dir} onChange={() => updateOutput('custom_output_dir', false)} className="accent-fill-pop" />
              {t('Next to source')}
            </label>
            <label className="flex items-center gap-1.5 text-[11px] text-text-1 cursor-pointer">
              <input type="radio" name="output_dir" checked={!!outputSettings.custom_output_dir} onChange={() => updateOutput('custom_output_dir', true)} className="accent-fill-pop" />
              {t('Custom folder')}
            </label>
          </div>

          {outputSettings.custom_output_dir && (
            <Input value={outputSettings.custom_output_dir_path || ''} onChange={(e) => updateOutput('custom_output_dir_path', e.target.value)} placeholder={t('Output path...')} />
          )}

          <div className="flex gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Checkbox id="keep_dir_struct" checked={!!outputSettings.keep_dir_struct} onCheckedChange={(v) => updateOutput('keep_dir_struct', !!v)} />
              <label htmlFor="keep_dir_struct" className="text-[11px] text-text-1 cursor-pointer">{t('Keep folder structure')}</label>
            </div>
            <div className="flex items-center gap-1.5">
              <Checkbox id="delete_original" checked={!!outputSettings.delete_original} onCheckedChange={(v) => updateOutput('delete_original', !!v)} />
              <label htmlFor="delete_original" className="text-[11px] text-text-1 cursor-pointer">{t('Delete original')}</label>
              {outputSettings.delete_original && (
                <Select value={outputSettings.delete_original_mode || 'To Trash'} onValueChange={(v) => updateOutput('delete_original_mode', v)}>
                  <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['To Trash', 'Permanently'].map((opt) => <SelectItem key={opt} value={opt}>{t(opt)}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <Checkbox id="clear_after_conv" checked={!!outputSettings.clear_after_conv} onCheckedChange={(v) => updateOutput('clear_after_conv', !!v)} />
              <label htmlFor="clear_after_conv" className="text-[11px] text-text-1 cursor-pointer">{t('Clear file list after conversion')}</label>
            </div>
          </div>
        </div>
      </LaneCard>
    </>
  );
}
