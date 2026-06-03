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
