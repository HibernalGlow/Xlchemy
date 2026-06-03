import * as React from 'react';
import { Resizer } from './Resizer';

const REM_BASE = 16;

interface PanelConfig {
	default: number;
	min: number;
	max?: number;
}

interface SplitViewProps {
	name: string;
	left: React.ReactNode;
	leftWidth: PanelConfig;
	right?: React.ReactNode;
	rightWidth?: PanelConfig;
	middle: React.ReactNode;
	direction?: 'horizontal' | 'vertical';
	className?: string;
}

function pxToRem(px: number): number {
	return px / REM_BASE;
}

function remToPx(rem: number): number {
	return rem * REM_BASE;
}

function loadPersistedValue(key: string): number | null {
	try {
		const raw = localStorage.getItem(key);
		if (!raw) return null;
		const parsed = JSON.parse(raw);
		if (typeof parsed === 'object' && parsed !== null && 'value' in parsed) {
			const elapsed = (Date.now() - parsed.timestamp) / 60000;
			if (elapsed > 1440) {
				localStorage.removeItem(key);
				return null;
			}
			return parsed.value;
		}
		return typeof parsed === 'number' ? parsed : null;
	} catch {
		return null;
	}
}

function persistValue(key: string, value: number): void {
	try {
		localStorage.setItem(key, JSON.stringify({ value, timestamp: Date.now() }));
	} catch {
		// localStorage may be full or unavailable
	}
}

export const SplitView: React.FC<SplitViewProps> = ({
	name,
	left,
	leftWidth,
	right,
	rightWidth,
	middle,
	direction = 'horizontal',
	className,
}) => {
	const containerRef = React.useRef<HTMLDivElement>(null);
	const leftRef = React.useRef<HTMLDivElement>(null);
	const rightRef = React.useRef<HTMLDivElement>(null);

	const isHorizontal = direction === 'horizontal';

	const [leftW, setLeftW] = React.useState<number>(() => {
		const persisted = loadPersistedValue(`${name}-left-width`);
		return persisted ?? leftWidth.default;
	});

	const [rightW, setRightW] = React.useState<number>(() => {
		if (!rightWidth) return 0;
		const persisted = loadPersistedValue(`${name}-right-width`);
		return persisted ?? rightWidth.default;
	});

	// Derive constrained widths based on container size
	const deriveConstrainedWidths = React.useCallback(() => {
		const container = containerRef.current;
		if (!container) return;

		const containerSize = isHorizontal
			? container.clientWidth
			: container.clientHeight;

		if (containerSize === 0) return;

		const containerRem = pxToRem(containerSize);

		// Calculate total gap space: 8px gap between each pair of visible panels
		const panelCount = 1 + (right ? 2 : 1); // left + middle (+ right)
		const gapCount = panelCount - 1;
		const gapRem = pxToRem(8 * gapCount);

		const available = containerRem - gapRem;

		const leftMin = leftWidth.min;
		const rightMin = rightWidth?.min ?? 0;

		// Constrain left width
		const leftMaxFromContainer = available - rightMin;
		const leftMax = leftWidth.max
			? Math.min(leftWidth.max, leftMaxFromContainer)
			: leftMaxFromContainer;
		const constrainedLeft = Math.max(leftMin, Math.min(leftMax, leftW));

		// Constrain right width
		let constrainedRight = 0;
		if (right && rightWidth) {
			const rightMaxFromContainer = available - constrainedLeft;
			const rightMax = rightWidth.max
				? Math.min(rightWidth.max, rightMaxFromContainer)
				: rightMaxFromContainer;
			constrainedRight = Math.max(rightMin, Math.min(rightMax, rightW));
		}

		setLeftW(constrainedLeft);
		if (rightWidth) {
			setRightW(constrainedRight);
		}
	}, [isHorizontal, leftW, rightW, leftWidth, rightWidth, right]);

	// Handle window resize
	React.useEffect(() => {
		const handleResize = () => {
			deriveConstrainedWidths();
		};

		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	}, [deriveConstrainedWidths]);

	// Initial constraint calculation
	React.useEffect(() => {
		deriveConstrainedWidths();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// Apply left panel width to DOM
	React.useEffect(() => {
		const el = leftRef.current;
		if (!el) return;

		if (isHorizontal) {
			el.style.width = `${leftW}rem`;
			el.style.minWidth = `${leftWidth.min}rem`;
			el.style.maxWidth = leftWidth.max ? `${leftWidth.max}rem` : '';
		} else {
			el.style.height = `${leftW}rem`;
			el.style.minHeight = `${leftWidth.min}rem`;
			el.style.maxHeight = leftWidth.max ? `${leftWidth.max}rem` : '';
		}
	}, [leftW, isHorizontal, leftWidth.min, leftWidth.max]);

	// Apply right panel width to DOM
	React.useEffect(() => {
		const el = rightRef.current;
		if (!el || !rightWidth) return;

		if (isHorizontal) {
			el.style.width = `${rightW}rem`;
			el.style.minWidth = `${rightWidth.min}rem`;
			el.style.maxWidth = rightWidth.max ? `${rightWidth.max}rem` : '';
		} else {
			el.style.height = `${rightW}rem`;
			el.style.minHeight = `${rightWidth.min}rem`;
			el.style.maxHeight = rightWidth.max ? `${rightWidth.max}rem` : '';
		}
	}, [rightW, isHorizontal, rightWidth]);

	// Persist on width changes
	React.useEffect(() => {
		persistValue(`${name}-left-width`, leftW);
	}, [name, leftW]);

	React.useEffect(() => {
		if (rightWidth) {
			persistValue(`${name}-right-width`, rightW);
		}
	}, [name, rightW, rightWidth]);

	const handleLeftResize = React.useCallback(
		(w: number) => {
			setLeftW(w);
		},
		[],
	);

	const handleRightResize = React.useCallback(
		(w: number) => {
			setRightW(w);
		},
		[],
	);

	const panelStyle: React.CSSProperties = {
		flexGrow: 0,
		flexShrink: 0,
		position: 'relative',
		border: '1px solid var(--border-2)',
		borderRadius: 'var(--radius-gb-lg, 10px)',
		overflow: 'hidden',
	};

	const middleStyle: React.CSSProperties = {
		flexGrow: 1,
		flexShrink: 1,
		minWidth: 0,
		minHeight: 0,
		border: '1px solid var(--border-2)',
		borderRadius: 'var(--radius-gb-lg, 10px)',
		overflow: 'hidden',
	};

	const containerStyle: React.CSSProperties = {
		display: 'flex',
		flexDirection: isHorizontal ? 'row' : 'column',
		gap: '8px',
		width: '100%',
		height: '100%',
	};

	return (
		<div ref={containerRef} style={containerStyle} className={className}>
			{/* Left panel */}
			<div ref={leftRef} style={panelStyle}>
				{left}
				<Resizer
					viewport={leftRef}
					direction={isHorizontal ? 'right' : 'down'}
					defaultValue={leftWidth.default}
					minWidth={isHorizontal ? leftWidth.min : undefined}
					maxWidth={isHorizontal ? leftWidth.max : undefined}
					minHeight={!isHorizontal ? leftWidth.min : undefined}
					maxHeight={!isHorizontal ? leftWidth.max : undefined}
					persistId={`${name}-left-width`}
					onWidth={isHorizontal ? handleLeftResize : undefined}
					onHeight={!isHorizontal ? handleLeftResize : undefined}
				/>
			</div>

			{/* Middle panel */}
			<div style={middleStyle}>{middle}</div>

			{/* Right panel */}
			{right && rightWidth && (
				<div ref={rightRef} style={panelStyle}>
					<Resizer
						viewport={rightRef}
						direction={isHorizontal ? 'left' : 'up'}
						defaultValue={rightWidth.default}
						minWidth={isHorizontal ? rightWidth.min : undefined}
						maxWidth={isHorizontal ? rightWidth.max : undefined}
						minHeight={!isHorizontal ? rightWidth.min : undefined}
						maxHeight={!isHorizontal ? rightWidth.max : undefined}
						persistId={`${name}-right-width`}
						onWidth={isHorizontal ? handleRightResize : undefined}
						onHeight={!isHorizontal ? handleRightResize : undefined}
					/>
					{right}
				</div>
			)}
		</div>
	);
};
