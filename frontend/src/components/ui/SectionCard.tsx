import * as React from 'react';
import { cn } from '~/utils/cn';

/* ── Header ─────────────────────────────────────────────────── */

interface SectionCardHeaderProps {
  title: string;
  actions?: React.ReactNode;
}

const SectionCardHeader: React.FC<SectionCardHeaderProps> = ({
  title,
  actions,
}) => (
  <div className="mb-3 flex items-center justify-between">
    <h3 className="text-xs font-medium text-text-1">{title}</h3>
    {actions && <div className="flex items-center gap-1.5">{actions}</div>}
  </div>
);

SectionCardHeader.displayName = 'SectionCardHeader';

/* ── Card ───────────────────────────────────────────────────── */

interface SectionCardProps {
  children: React.ReactNode;
  className?: string;
}

const SectionCardRoot: React.FC<SectionCardProps> = ({
  children,
  className,
}) => (
  <div
    className={cn(
      'rounded-gb border border-border-2 bg-bg-1 p-4',
      className,
    )}
  >
    {children}
  </div>
);

SectionCardRoot.displayName = 'SectionCard';

const SectionCard = Object.assign(SectionCardRoot, {
  Header: SectionCardHeader,
});

export { SectionCard, SectionCardHeader };
