import * as React from 'react';
import { useAppState } from '~/hooks/useAppState';
import { useT } from '~/hooks/useT';
import { LaneCard } from '~/components/canvas/LaneCard';
import { Button } from '~/components/ui/Button';
import { ToggleGroup } from '~/components/ui/ToggleGroup';
import { Badge } from '~/components/ui/Badge';
import { cn } from '~/utils/cn';

export function InputLane() {
  const t = useT();
  const {
    fileItems,
    sortedItems,
    allowedInput,
    excludedFormats,
    toggleExcludedFormat,
    handleAddFiles,
    handleAddFolder,
    clearFiles,
    orderOptions,
    processingOrder,
    sortingDisabled,
    appSettings,
    setAppSettings,
    isConverting,
  } = useAppState();

  return (
    <>
      {/* Files Card */}
      <LaneCard
        id="input-files"
        laneId="input"
        expandable
        detail={
          <div className="flex flex-col gap-3 text-xs text-text-2">
            <h3 className="text-sm font-semibold text-text-1">{t('Files Overview')}</h3>
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between"><span>{t('Total files:')}</span><span className="text-text-1 font-medium">{fileItems.length}</span></div>
              <div className="flex justify-between">
                <span>{t('Total size:')}</span>
                <span className="text-text-1 font-medium">
                  {fileItems.reduce((s: number, f: any) => s + (f.size || 0), 0) > 1048576
                    ? `${(fileItems.reduce((s: number, f: any) => s + (f.size || 0), 0) / 1048576).toFixed(1)} MB`
                    : `${(fileItems.reduce((s: number, f: any) => s + (f.size || 0), 0) / 1024).toFixed(0)} KB`}
                </span>
              </div>
              <div className="flex justify-between">
                <span>{t('Formats:')}</span>
                <span className="text-text-1 font-medium">
                  {Array.from(new Set(fileItems.map((f: any) => f.ext))).join(', ') || '—'}
                </span>
              </div>
            </div>
            {fileItems.length > 0 && (
              <div className="mt-2">
                <h4 className="text-[11px] font-medium text-text-1 mb-1">{t('Recent files')}</h4>
                <div className="flex flex-col gap-1">
                  {fileItems.slice(-5).reverse().map((f: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 px-2 py-1 rounded bg-[var(--bg-1)]">
                      <span className="text-text-1 truncate flex-1">{f.name}</span>
                      <span className="text-text-2 text-[10px]">.{f.ext}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        }
        header={
          <span className="flex items-center gap-2">
            {t('Files')}
            {fileItems.length > 0 && (
              <Badge variant="secondary" className="text-[10px]">{fileItems.length}</Badge>
            )}
          </span>
        }
        grow
        actions={
          <div className="flex gap-1">
            <Button kind="outline" variant="neutral" size="sm" onClick={handleAddFiles} disabled={isConverting}>
              {t('Add Files')}
            </Button>
            <Button kind="outline" variant="neutral" size="sm" onClick={handleAddFolder} disabled={isConverting}>
              {t('Add Folder')}
            </Button>
            <Button kind="ghost" variant="neutral" size="sm" onClick={clearFiles} disabled={isConverting || fileItems.length === 0}>
              {t('Clear')}
            </Button>
          </div>
        }
      >
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[var(--border-2)]">
              <th className="text-left p-1.5 font-medium text-text-2 w-2/5">{t('Name')}</th>
              <th className="text-left p-1.5 font-medium text-text-2 w-[15%]">{t('Ext')}</th>
              <th className="text-left p-1.5 font-medium text-text-2">{t('Location')}</th>
            </tr>
          </thead>
          <tbody>
            {sortedItems.length === 0 ? (
              <tr>
                <td colSpan={3} className="p-4 text-center text-text-2 text-xs">
                  {t('No files added')}
                </td>
              </tr>
            ) : (
              sortedItems.map((item: any, i: number) => (
                <tr key={i} className="border-b border-[var(--border-2)]/50 hover:bg-[var(--bg-3)] transition-colors">
                  <td className="p-1.5 text-text-1">{item.name}</td>
                  <td className="p-1.5 text-text-2">{item.ext}</td>
                  <td className="p-1.5 text-text-2 truncate max-w-[160px]">{item.dir}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </LaneCard>

      {/* Filter Card */}
      <LaneCard
        id="input-filter"
        laneId="input"
        movable
        header={t('Filter')}
        defaultCollapsed={allowedInput.length === 0}
      >
        {allowedInput.length > 0 ? (
          <div className="flex flex-col gap-2">
            <div className="flex gap-1 items-center flex-wrap">
              <span className="text-[11px] text-text-2">{t('Exclude:')}</span>
              {allowedInput.map((ext: string) => {
                const excluded = excludedFormats.has(ext);
                return (
                  <button
                    key={ext}
                    className={cn(
                      'px-1.5 py-0.5 text-[10px] rounded border transition-colors cursor-pointer font-medium',
                      excluded
                        ? 'text-text-2 border-[var(--border-2)] bg-transparent'
                        : 'bg-fill-pop text-[var(--bg-2)] border-fill-pop',
                    )}
                    onClick={() => toggleExcludedFormat(ext)}
                  >
                    .{ext.toUpperCase()}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-1 items-center flex-wrap">
              <span className="text-[11px] text-text-2">{t('Order:')}</span>
              <ToggleGroup
                options={orderOptions}
                value={processingOrder}
                onChange={(key) => {
                  if (sortingDisabled) return;
                  setAppSettings((prev: any) => ({ ...prev, processing_order: key }));
                }}
                disabled={sortingDisabled}
              />
            </div>
          </div>
        ) : (
          <span className="text-[11px] text-text-2">{t('No formats to filter')}</span>
        )}
      </LaneCard>
    </>
  );
}
