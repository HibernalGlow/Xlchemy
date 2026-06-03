import * as React from 'react';
import { useAppState } from '~/hooks/useAppState';
import { useT } from '~/hooks/useT';
import { LaneCard } from '~/components/canvas/LaneCard';
import { Button } from '~/components/ui/Button';
import { Badge } from '~/components/ui/Badge';

export function AboutLane() {
  const t = useT();
  const { constants } = useAppState();

  return (
    <LaneCard id="about-info" header={t('About')}>
      <div className="flex flex-col items-center gap-3 py-4">
        {/* Logo */}
        <div className="w-14 h-14 rounded-2xl bg-fill-pop flex items-center justify-center text-bg-2 font-bold text-2xl shadow-lg">
          X
        </div>
        <h2 className="text-xl font-light text-text-1">{t('Xlchemy')}</h2>
        <Badge variant="secondary">v{constants.version || '1.2.6'}</Badge>
        <p className="text-[11px] text-text-2">{t('High-performance image converter')}</p>
        <p className="text-[10px] text-text-2">{t('Built with Wails 3 + React + Go')}</p>
        <div className="flex gap-2 mt-2">
          <Button
            kind="outline" variant="neutral" size="sm"
            onClick={() => window.open('https://codepoems.eu', '_blank')}
          >
            {t('Website')}
          </Button>
          <Button
            kind="outline" variant="neutral" size="sm"
            onClick={() => window.open('https://github.com/nicjacek/xlchemy', '_blank')}
          >
            {t('Source')}
          </Button>
        </div>
      </div>
    </LaneCard>
  );
}
