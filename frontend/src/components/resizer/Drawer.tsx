import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { Resizer } from './Resizer';

interface DrawerProps {
	header: React.ReactNode;
	children: React.ReactNode;
	persistId?: string;
	defaultCollapsed?: boolean;
	bottomBorder?: boolean;
	grow?: boolean;
	resizer?: {
		direction: 'up' | 'down';
		defaultHeight: number;
		minHeight: number;
		maxHeight?: number;
		persistId: string;
	};
	onToggle?: (collapsed: boolean) => void;
	className?: string;
}

function loadCollapsedState(persistId: string | undefined, defaultValue: boolean): boolean {
	if (!persistId) return defaultValue;
	try {
		const raw = localStorage.getItem(persistId);
		if (raw === null) return defaultValue;
		return raw === 'true';
	} catch {
		return defaultValue;
	}
}

function persistCollapsedState(persistId: string | undefined, collapsed: boolean): void {
	if (!persistId) return;
	try {
		localStorage.setItem(persistId, String(collapsed));
	} catch {
		// localStorage may be full or unavailable
	}
}

export const Drawer: React.FC<DrawerProps> = ({
	header,
	children,
	persistId,
	defaultCollapsed = false,
	bottomBorder = false,
	grow = false,
	resizer,
	onToggle,
	className,
}) => {
	const contentRef = React.useRef<HTMLDivElement>(null);
	const [collapsed, setCollapsed] = React.useState<boolean>(() =>
		loadCollapsedState(persistId, defaultCollapsed),
	);

	const handleToggle = React.useCallback(() => {
		setCollapsed((prev) => {
			const next = !prev;
			persistCollapsedState(persistId, next);
			onToggle?.(next);
			return next;
		});
	}, [persistId, onToggle]);

	const containerStyle: React.CSSProperties = {
		display: 'flex',
		flexDirection: 'column',
		flexGrow: grow ? 1 : 0,
		flexShrink: 0,
		background: 'var(--bg-1)',
		overflow: 'hidden',
		...(bottomBorder && !collapsed && {
			borderBottom: '1px solid var(--border-2)',
		}),
	};

	const headerStyle: React.CSSProperties = {
		display: 'flex',
		alignItems: 'center',
		cursor: 'pointer',
		userSelect: 'none',
		flexShrink: 0,
	};

	const chevronStyle: React.CSSProperties = {
		transition: 'transform 0.2s ease',
		transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
		flexShrink: 0,
	};

	const contentStyle: React.CSSProperties = {
		flexGrow: 1,
		minHeight: 0,
		overflow: 'hidden',
		position: 'relative',
	};

	return (
		<div style={containerStyle} className={className}>
			<div style={headerStyle} onClick={handleToggle}>
				<ChevronDown style={chevronStyle} size={16} />
				{header}
			</div>
			{!collapsed && (
				<div ref={contentRef} style={contentStyle}>
					{children}
					{resizer && (
						<Resizer
							viewport={contentRef}
							direction={resizer.direction}
							defaultValue={resizer.defaultHeight}
							minHeight={resizer.minHeight}
							maxHeight={resizer.maxHeight}
							persistId={resizer.persistId}
						/>
					)}
				</div>
			)}
		</div>
	);
};
