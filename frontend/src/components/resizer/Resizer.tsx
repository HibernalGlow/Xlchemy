import * as React from 'react';
import { ResizeGroup } from './ResizeGroup';
import { resizeSync } from './ResizeSync';

const STORAGE_EXPIRY_MINUTES = 1440;
const REM_BASE = 16;

function pxToRem(px: number, zoom: number): number {
	return px / (REM_BASE * zoom);
}

interface StoredValue {
	value: number;
	timestamp: number;
}

export interface ResizerProps {
	viewport: React.RefObject<HTMLElement>;
	direction: 'left' | 'right' | 'up' | 'down';
	defaultValue?: number;
	minWidth?: number;
	maxWidth?: number;
	minHeight?: number;
	maxHeight?: number;
	persistId?: string;
	syncName?: string;
	resizeGroup?: ResizeGroup;
	order?: number;
	showBorder?: boolean;
	passive?: boolean;
	disabled?: boolean;
	onWidth?: (w: number) => void;
	onHeight?: (h: number) => void;
	onResizing?: (resizing: boolean) => void;
	onOverflow?: (overflow: number) => void;
	onDblClick?: () => void;
}

export const Resizer: React.FC<ResizerProps> = ({
	viewport,
	direction,
	defaultValue,
	minWidth = 0,
	maxWidth = Infinity,
	minHeight = 0,
	maxHeight = Infinity,
	persistId,
	syncName,
	resizeGroup,
	order = 0,
	showBorder = false,
	passive = false,
	disabled = false,
	onWidth,
	onHeight,
	onResizing,
	onOverflow,
	onDblClick,
}) => {
	const resizerId = React.useRef<symbol>(Symbol('resizer'));
	const currentValue = React.useRef<number>(0);
	const isHorizontal = direction === 'left' || direction === 'right';

	// Stable refs for callbacks to avoid re-creating mousedown handler
	const onWidthRef = React.useRef(onWidth);
	onWidthRef.current = onWidth;
	const onHeightRef = React.useRef(onHeight);
	onHeightRef.current = onHeight;
	const onResizingRef = React.useRef(onResizing);
	onResizingRef.current = onResizing;
	const onOverflowRef = React.useRef(onOverflow);
	onOverflowRef.current = onOverflow;

	// ---- Persistence ----
	function loadPersistedValue(): number | null {
		if (!persistId) return null;
		try {
			const raw = localStorage.getItem(persistId);
			if (!raw) return null;
			const stored: StoredValue = JSON.parse(raw);
			const elapsed = (Date.now() - stored.timestamp) / 60000;
			if (elapsed > STORAGE_EXPIRY_MINUTES) {
				localStorage.removeItem(persistId);
				return null;
			}
			return stored.value;
		} catch {
			return null;
		}
	}

	function persistValue(value: number): void {
		if (!persistId) return;
		try {
			const stored: StoredValue = { value, timestamp: Date.now() };
			localStorage.setItem(persistId, JSON.stringify(stored));
		} catch {
			// localStorage may be full or unavailable
		}
	}

	// ---- Limits ----
	function applyLimits(value: number): number {
		if (isHorizontal) {
			return Math.max(minWidth, Math.min(maxWidth, value));
		} else {
			return Math.max(minHeight, Math.min(maxHeight, value));
		}
	}

	// ---- DOM update ----
	function updateDom(value: number): void {
		const el = viewport.current;
		if (!el) return;

		if (isHorizontal) {
			el.style.width = `${value}rem`;
			el.style.maxWidth = `${maxWidth}rem`;
			el.style.minWidth = `${minWidth}rem`;
		} else {
			el.style.height = `${value}rem`;
			el.style.maxHeight = `${maxHeight}rem`;
			el.style.minHeight = `${minHeight}rem`;
		}
	}

	function clearDomStyles(): void {
		const el = viewport.current;
		if (!el) return;

		if (isHorizontal) {
			el.style.width = '';
			el.style.maxWidth = '';
			el.style.minWidth = '';
		} else {
			el.style.height = '';
			el.style.maxHeight = '';
			el.style.minHeight = '';
		}
	}

	// ---- Value setter ----
	function setValue(value: number): void {
		const limited = applyLimits(value);
		currentValue.current = limited;

		if (!passive && !disabled) {
			updateDom(limited);
		}

		if (isHorizontal) {
			onWidthRef.current?.(limited);
		} else {
			onHeightRef.current?.(limited);
		}
	}

	// ---- ResizeGroup registration ----
	React.useEffect(() => {
		if (!resizeGroup) return;

		const handle = {
			resizerId: resizerId.current,
			getValue: () => currentValue.current,
			setValue: (v: number) => setValue(v),
			minValue: isHorizontal ? minWidth : minHeight,
			position: order,
		};

		resizeGroup.register(handle);
		return () => {
			resizeGroup.unregister(resizerId.current);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [resizeGroup, isHorizontal, minWidth, minHeight, order]);

	// ---- ResizeSync subscription ----
	React.useEffect(() => {
		if (!syncName) return;

		const unsubscribe = resizeSync.subscribe(
			syncName,
			resizerId.current,
			(value: number) => {
				setValue(value);
				persistValue(value);
			},
		);

		return unsubscribe;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [syncName]);

	// ---- Initialize value ----
	React.useEffect(() => {
		if (disabled || passive) {
			clearDomStyles();
			return;
		}

		const persisted = loadPersistedValue();
		const initial = persisted ?? defaultValue ?? 0;
		const limited = applyLimits(initial);
		currentValue.current = limited;
		updateDom(limited);

		if (isHorizontal) {
			onWidthRef.current?.(limited);
		} else {
			onHeightRef.current?.(limited);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [disabled, passive]);

	// ---- Drag logic ----
	const handleMouseDown = React.useCallback(
		(e: React.MouseEvent) => {
			if (disabled) return;
			e.preventDefault();

			const startX = e.clientX;
			const startY = e.clientY;
			const startValue = currentValue.current;
			const zoom = window.devicePixelRatio || 1;
			let lastClampedValue = startValue;
			let lastRawDelta = 0;

			const handleMouseMove = (moveEvent: MouseEvent) => {
				const dx = moveEvent.clientX - startX;
				const dy = moveEvent.clientY - startY;

				let deltaRem: number;
				if (direction === 'right') {
					deltaRem = pxToRem(dx, zoom);
				} else if (direction === 'left') {
					deltaRem = pxToRem(-dx, zoom);
				} else if (direction === 'down') {
					deltaRem = pxToRem(dy, zoom);
				} else {
					// up
					deltaRem = pxToRem(-dy, zoom);
				}

				lastRawDelta = deltaRem;
				let desiredValue = startValue + deltaRem;

				if (resizeGroup) {
					const subtracted = resizeGroup.resize(
						resizerId.current,
						desiredValue,
					);
					desiredValue = desiredValue + subtracted;
				}

				const clampedValue = applyLimits(desiredValue);
				currentValue.current = clampedValue;
				lastClampedValue = clampedValue;

				if (!passive) {
					updateDom(clampedValue);
				}

				if (isHorizontal) {
					onWidthRef.current?.(clampedValue);
				} else {
					onHeightRef.current?.(clampedValue);
				}

				onResizingRef.current?.(true);

				// Sync on shift
				if (moveEvent.shiftKey && syncName) {
					resizeSync.emit(syncName, resizerId.current, clampedValue);
				}
			};

			const handleMouseUp = () => {
				document.removeEventListener('mousemove', handleMouseMove);
				document.removeEventListener('mouseup', handleMouseUp);
				document.body.style.cursor = '';
				document.body.style.userSelect = '';

				persistValue(lastClampedValue);
				onResizingRef.current?.(false);

				// Calculate overflow: the amount that was desired but couldn't be applied
				const desiredValue = startValue + lastRawDelta;
				const clamped = applyLimits(desiredValue);
				const overflow = desiredValue - clamped;
				if (overflow !== 0) {
					onOverflowRef.current?.(overflow);
				}
			};

			document.addEventListener('mousemove', handleMouseMove);
			document.addEventListener('mouseup', handleMouseUp);
			document.body.style.cursor = isHorizontal ? 'col-resize' : 'row-resize';
			document.body.style.userSelect = 'none';
		},
		[disabled, direction, isHorizontal, passive, resizeGroup, syncName],
	);

	const handleDoubleClick = React.useCallback(() => {
		if (disabled) return;

		if (onDblClick) {
			onDblClick();
			return;
		}

		if (defaultValue !== undefined) {
			const limited = applyLimits(defaultValue);
			setValue(limited);
			persistValue(limited);

			if (syncName) {
				resizeSync.emit(syncName, resizerId.current, limited);
			}
		}
	}, [disabled, defaultValue, syncName, onDblClick]);

	// ---- Styles ----
	const isRight = direction === 'right';
	const isLeft = direction === 'left';
	const isDown = direction === 'down';
	const isUp = direction === 'up';

	const handleStyle: React.CSSProperties = {
		position: 'absolute',
		zIndex: 'var(--z-lifted, 2)',
		cursor: isHorizontal ? 'col-resize' : 'row-resize',
		...(isRight && {
			right: -4,
			top: 0,
			height: '100%',
			width: 4,
		}),
		...(isLeft && {
			left: -4,
			top: 0,
			height: '100%',
			width: 4,
		}),
		...(isDown && {
			bottom: -4,
			left: 0,
			width: '100%',
			height: 4,
		}),
		...(isUp && {
			top: -4,
			left: 0,
			width: '100%',
			height: 4,
		}),
	};

	const borderStyle: React.CSSProperties = showBorder
		? {
				...(isRight && { borderLeft: '1px solid var(--border-2)' }),
				...(isLeft && { borderRight: '1px solid var(--border-2)' }),
				...(isDown && { borderTop: '1px solid var(--border-2)' }),
				...(isUp && { borderBottom: '1px solid var(--border-2)' }),
			}
		: {};

	return (
		<div
			style={{ ...handleStyle, ...borderStyle }}
			onMouseDown={handleMouseDown}
			onDoubleClick={handleDoubleClick}
		/>
	);
};
