import {
  FileInput,
  FileOutput,
  Info,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  SlidersHorizontal,
} from 'lucide-react';
import { useT } from '~/hooks/useT';
import { cn } from '~/utils/cn';

export interface SidebarNavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface AppSidebarProps {
  items: SidebarNavItem[];
  activeIndex: number;
  collapsed: boolean;
  onSelect: (index: number) => void;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
  disabled?: boolean;
}

const navIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  Input: FileInput,
  Output: FileOutput,
  Modify: SlidersHorizontal,
  Settings: Settings,
  About: Info,
};

export function AppSidebar({
  items,
  activeIndex,
  collapsed,
  onSelect,
  onToggle,
  mobileOpen,
  onMobileClose,
  disabled,
}: AppSidebarProps) {
  const t = useT();

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside
        role="navigation"
        aria-label="Main navigation"
        className={cn(
          'flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-200 shrink-0 z-50',
          !mobileOpen && (collapsed ? 'w-14' : 'w-52'),
          mobileOpen && 'w-52',
          // Mobile: fixed overlay drawer
          'max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:w-56 max-md:shadow-xl',
          'max-md:transition-transform max-md:duration-200',
          mobileOpen
            ? 'max-md:translate-x-0'
            : 'max-md:-translate-x-full',
        )}
      >
        {/* Header */}
        <div
          className={cn(
            'shrink-0 border-b border-sidebar-border',
            collapsed && !mobileOpen ? 'p-2' : 'px-4 py-3',
          )}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0 shadow-sm">
              X
            </div>
            {(!collapsed || mobileOpen) && (
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-semibold truncate">{t('Xlchemy')}</span>
                <span className="text-[10px] text-muted-foreground truncate">
                  {t('Image Converter')}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-1.5" aria-label="Sidebar navigation">
          {items.map((item, i) => {
            const Icon = item.icon || navIcons[item.label] || FileInput;
            const isActive = activeIndex === i;
            return (
              <button
                key={item.label}
                role="menuitem"
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 w-full transition-all duration-150 cursor-pointer rounded-md mx-1.5',
                  collapsed && !mobileOpen
                    ? 'px-0 py-2.5 justify-center w-[calc(100%-0.75rem)]'
                    : 'px-3 py-2.5',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
                  disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
                )}
                disabled={disabled}
                onClick={() => onSelect(i)}
                title={collapsed && !mobileOpen ? item.label : undefined}
              >
                <Icon
                  className={cn(
                    'shrink-0 transition-transform',
                    isActive ? 'w-5 h-5' : 'w-[18px] h-[18px]',
                  )}
                />
                {(mobileOpen || !collapsed) && (
                  <span className="text-sm truncate">{item.label}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Collapse toggle (desktop only) */}
        <button
          className="hidden md:flex items-center justify-center p-2.5 border-t border-sidebar-border text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/30 transition-colors cursor-pointer"
          onClick={onToggle}
          aria-label={collapsed ? t('Expand sidebar') : t('Collapse sidebar')}
        >
          {collapsed ? (
            <PanelLeftOpen className="w-4 h-4" />
          ) : (
            <PanelLeftClose className="w-4 h-4" />
          )}
        </button>
      </aside>
    </>
  );
}
