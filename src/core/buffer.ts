import { isWideChar } from './charwidth';
import type { Rect } from './layout';
import type { Color, Style } from './style';
import { Color as C, patchStyle } from './style';

// Cell

interface Cell {
	readonly symbol: string;
	readonly fg: Color;
	readonly bg: Color;
	readonly underlineColor?: Color;
	readonly modifier: number;
}

const DEFAULT_CELL: Cell = {
	symbol: ' ',
	fg: C.Reset,
	bg: C.Reset,
	modifier: 0,
};

const createCell = (overrides?: Partial<Cell>): Cell => {
	if (!overrides) {
		return { ...DEFAULT_CELL };
	}
	return { ...DEFAULT_CELL, ...overrides };
};

const cellSetSymbol = (cell: Cell, symbol: string): Cell => ({
	...cell,
	symbol,
});

const cellSetStyle = (cell: Cell, style: Style): Cell => {
	const fg = style.fg ?? cell.fg;
	const bg = style.bg ?? cell.bg;
	const underlineColor = style.underlineColor ?? cell.underlineColor;
	const modifier = (cell.modifier | style.addModifier) & ~style.subModifier;

	return {
		symbol: cell.symbol,
		fg,
		bg,
		...(underlineColor !== undefined ? { underlineColor } : {}),
		modifier,
	};
};

const cellReset = (_cell: Cell): Cell => ({ ...DEFAULT_CELL });

const charWidth = (code: number): number => {
	if (code === 0) {
		return 0;
	}
	return isWideChar(code) ? 2 : 1;
};

const cellWidth = (cell: Cell): number => {
	if (cell.symbol.length === 0) {
		return 0;
	}
	const code = cell.symbol.codePointAt(0) ?? 0;
	return charWidth(code);
};

// Buffer

interface Buffer {
	readonly area: Rect;
	readonly content: Cell[];
}

const createBuffer = (area: Rect, cell?: Cell): Buffer => {
	const fill = cell ?? createCell();
	const len = area.width * area.height;
	const content: Cell[] = [];
	for (let i = 0; i < len; i++) {
		content.push({ ...fill });
	}
	return { area, content };
};

const bufferIndex = (buffer: Buffer, x: number, y: number): number =>
	(y - buffer.area.y) * buffer.area.width + (x - buffer.area.x);

const bufferInBounds = (buffer: Buffer, x: number, y: number): boolean => {
	const { area } = buffer;
	return x >= area.x && x < area.x + area.width && y >= area.y && y < area.y + area.height;
};

const bufferCell = (buffer: Buffer, x: number, y: number): Cell | undefined => {
	if (!bufferInBounds(buffer, x, y)) {
		return undefined;
	}
	return buffer.content[bufferIndex(buffer, x, y)];
};

const bufferSetCell = (buffer: Buffer, x: number, y: number, cell: Cell): void => {
	if (!bufferInBounds(buffer, x, y)) {
		return;
	}
	buffer.content[bufferIndex(buffer, x, y)] = cell;
};

const bufferSetString = (
	buffer: Buffer,
	x: number,
	y: number,
	str: string,
	style: Style,
): void => {
	let cx = x;
	for (const ch of str) {
		if (!bufferInBounds(buffer, cx, y)) {
			break;
		}
		const code = ch.codePointAt(0) ?? 0;
		const w = charWidth(code);
		const cell = cellSetStyle(createCell({ symbol: ch }), style);
		buffer.content[bufferIndex(buffer, cx, y)] = cell;
		cx += 1;

		// For wide characters, fill the next cell with an empty placeholder
		if (w === 2 && bufferInBounds(buffer, cx, y)) {
			buffer.content[bufferIndex(buffer, cx, y)] = cellSetStyle(createCell({ symbol: '' }), style);
			cx += 1;
		}
	}
};

const bufferSetStyle = (buffer: Buffer, area: Rect, style: Style): void => {
	const x0 = Math.max(area.x, buffer.area.x);
	const y0 = Math.max(area.y, buffer.area.y);
	const x1 = Math.min(area.x + area.width, buffer.area.x + buffer.area.width);
	const y1 = Math.min(area.y + area.height, buffer.area.y + buffer.area.height);

	for (let y = y0; y < y1; y++) {
		for (let x = x0; x < x1; x++) {
			const idx = bufferIndex(buffer, x, y);
			const existing = buffer.content[idx];
			if (existing !== undefined) {
				buffer.content[idx] = cellSetStyle(existing, style);
			}
		}
	}
};

interface Span {
	readonly content: string;
	readonly style: Style;
}

interface Line {
	readonly spans: readonly Span[];
}

const bufferSetLine = (
	buffer: Buffer,
	x: number,
	y: number,
	line: Line,
	maxWidth: number,
	style: Style,
): void => {
	let cx = x;
	const xEnd = x + maxWidth;

	for (const span of line.spans) {
		if (cx >= xEnd) {
			break;
		}
		const merged = patchStyle(style, span.style);
		for (const ch of span.content) {
			if (cx >= xEnd) {
				break;
			}
			if (!bufferInBounds(buffer, cx, y)) {
				break;
			}
			const code = ch.codePointAt(0) ?? 0;
			const w = charWidth(code);

			// Skip if wide char would exceed maxWidth
			if (w === 2 && cx + 1 >= xEnd) {
				break;
			}

			buffer.content[bufferIndex(buffer, cx, y)] = cellSetStyle(
				createCell({ symbol: ch }),
				merged,
			);
			cx += 1;

			if (w === 2 && bufferInBounds(buffer, cx, y)) {
				buffer.content[bufferIndex(buffer, cx, y)] = cellSetStyle(
					createCell({ symbol: '' }),
					merged,
				);
				cx += 1;
			}
		}
	}
};

interface CellDiff {
	readonly x: number;
	readonly y: number;
	readonly cell: Cell;
}

const cellsEqual = (a: Cell, b: Cell): boolean =>
	a.symbol === b.symbol &&
	a.fg.type === b.fg.type &&
	a.bg.type === b.bg.type &&
	a.modifier === b.modifier &&
	colorEqual(a.fg, b.fg) &&
	colorEqual(a.bg, b.bg) &&
	colorEqual(a.underlineColor, b.underlineColor);

const colorEqual = (a: Color | undefined, b: Color | undefined): boolean => {
	if (a === undefined && b === undefined) {
		return true;
	}
	if (a === undefined || b === undefined) {
		return false;
	}
	if (a.type !== b.type) {
		return false;
	}
	if (a.type === 'indexed' && b.type === 'indexed') {
		return a.index === b.index;
	}
	if (a.type === 'rgb' && b.type === 'rgb') {
		return a.r === b.r && a.g === b.g && a.b === b.b;
	}
	return true;
};

const bufferDiff = (prev: Buffer, next: Buffer): readonly CellDiff[] => {
	const diffs: CellDiff[] = [];
	const { area } = next;

	for (let y = area.y; y < area.y + area.height; y++) {
		for (let x = area.x; x < area.x + area.width; x++) {
			const idx = bufferIndex(next, x, y);
			const prevCell = prev.content[idx];
			const nextCell = next.content[idx];
			if (prevCell === undefined || nextCell === undefined) {
				continue;
			}
			if (!cellsEqual(prevCell, nextCell)) {
				diffs.push({ x, y, cell: nextCell });
			}
		}
	}
	return diffs;
};

const bufferMerge = (dest: Buffer, src: Buffer): void => {
	const x0 = Math.max(src.area.x, dest.area.x);
	const y0 = Math.max(src.area.y, dest.area.y);
	const x1 = Math.min(src.area.x + src.area.width, dest.area.x + dest.area.width);
	const y1 = Math.min(src.area.y + src.area.height, dest.area.y + dest.area.height);

	for (let y = y0; y < y1; y++) {
		for (let x = x0; x < x1; x++) {
			const srcIdx = bufferIndex(src, x, y);
			const destIdx = bufferIndex(dest, x, y);
			const srcCell = src.content[srcIdx];
			if (srcCell !== undefined) {
				dest.content[destIdx] = srcCell;
			}
		}
	}
};

export type { Cell, Buffer, Span, Line, CellDiff };
export {
	createCell,
	cellSetSymbol,
	cellSetStyle,
	cellReset,
	cellWidth,
	charWidth,
	createBuffer,
	bufferIndex,
	bufferCell,
	bufferSetCell,
	bufferSetString,
	bufferSetStyle,
	bufferSetLine,
	bufferDiff,
	bufferMerge,
};
