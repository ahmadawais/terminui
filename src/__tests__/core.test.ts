import { describe, it, expect } from 'vitest';

import {
	Color,
	indexedColor,
	rgbColor,
	Modifier,
	createStyle,
	styleFg,
	styleBg,
	styleAddModifier,
	styleSubModifier,
	patchStyle,
	resetStyle,
} from '../core/style';

import {
	createPosition,
	createSize,
	createMargin,
	uniformMargin,
	noMargin,
	EMPTY_RECT,
	createRect,
	rectArea,
	rectIsEmpty,
	rectLeft,
	rectRight,
	rectTop,
	rectBottom,
	rectContains,
	rectInner,
	rectOuter,
	rectIntersection,
	rectUnion,
	rectRows,
	rectColumns,
	rectPositions,
	minConstraint,
	maxConstraint,
	lengthConstraint,
	percentageConstraint,
	ratioConstraint,
	fillConstraint,
	applyConstraint,
	createLayout,
	splitLayout,
} from '../core/layout';

import {
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
} from '../core/buffer';

import {
	isWideChar,
	stringWidth,
	createSpan,
	rawSpan,
	styledSpan,
	spanWidth,
	spanPatchStyle,
	rawLine,
	styledLine,
	lineWidth,
	lineHeight,
	linePatchStyle,
	linePushSpan,
	lineAlignment,
	createText,
	rawText,
	styledText,
	textWidth,
	textHeight,
	textPatchStyle,
	textPushLine,
	textPushSpan,
} from '../core/text';

import {
	createTerminal,
	terminalDraw,
	terminalResize,
	frameRenderWidget,
	frameSetCursorPosition,
} from '../core/terminal';

import {
	createTestBackendState,
	createTestBackend,
} from '../backends/test';

import {
	border,
	bar,
	line,
	scrollbar,
	shade,
	BRAILLE_OFFSET,
} from '../core/symbols';

// ---------------------------------------------------------------------------
// style.ts
// ---------------------------------------------------------------------------

describe('style', () => {
	describe('Color constants', () => {
		it('has named color constants', () => {
			expect(Color.Reset).toEqual({ type: 'reset' });
			expect(Color.Black).toEqual({ type: 'black' });
			expect(Color.Red).toEqual({ type: 'red' });
			expect(Color.Green).toEqual({ type: 'green' });
			expect(Color.Yellow).toEqual({ type: 'yellow' });
			expect(Color.Blue).toEqual({ type: 'blue' });
			expect(Color.Magenta).toEqual({ type: 'magenta' });
			expect(Color.Cyan).toEqual({ type: 'cyan' });
			expect(Color.Gray).toEqual({ type: 'gray' });
			expect(Color.DarkGray).toEqual({ type: 'dark-gray' });
			expect(Color.White).toEqual({ type: 'white' });
		});
	});

	describe('indexedColor', () => {
		it('creates an indexed color', () => {
			expect(indexedColor(42)).toEqual({ type: 'indexed', index: 42 });
		});

		it('throws for out-of-range values', () => {
			expect(() => indexedColor(-1)).toThrow();
			expect(() => indexedColor(256)).toThrow();
		});

		it('accepts boundary values', () => {
			expect(indexedColor(0)).toEqual({ type: 'indexed', index: 0 });
			expect(indexedColor(255)).toEqual({ type: 'indexed', index: 255 });
		});
	});

	describe('rgbColor', () => {
		it('creates an rgb color', () => {
			expect(rgbColor(255, 128, 0)).toEqual({ type: 'rgb', r: 255, g: 128, b: 0 });
		});

		it('throws for out-of-range values', () => {
			expect(() => rgbColor(256, 0, 0)).toThrow();
			expect(() => rgbColor(0, -1, 0)).toThrow();
			expect(() => rgbColor(0, 0, 256)).toThrow();
		});
	});

	describe('Modifier', () => {
		it('has correct constant values', () => {
			expect(Modifier.NONE).toBe(0);
			expect(Modifier.BOLD).toBe(1);
			expect(Modifier.ITALIC).toBe(4);
		});

		it('contains checks bitflag membership', () => {
			const flags = Modifier.BOLD | Modifier.ITALIC;
			expect(Modifier.contains(flags, Modifier.BOLD)).toBe(true);
			expect(Modifier.contains(flags, Modifier.ITALIC)).toBe(true);
			expect(Modifier.contains(flags, Modifier.DIM)).toBe(false);
		});

		it('add sets a flag', () => {
			expect(Modifier.add(0, Modifier.BOLD)).toBe(Modifier.BOLD);
		});

		it('remove clears a flag', () => {
			const flags = Modifier.BOLD | Modifier.ITALIC;
			expect(Modifier.remove(flags, Modifier.BOLD)).toBe(Modifier.ITALIC);
		});
	});

	describe('createStyle', () => {
		it('returns default style with no args', () => {
			const s = createStyle();
			expect(s.addModifier).toBe(0);
			expect(s.subModifier).toBe(0);
			expect(s.fg).toBeUndefined();
			expect(s.bg).toBeUndefined();
		});

		it('accepts overrides', () => {
			const s = createStyle({ fg: Color.Red });
			expect(s.fg).toEqual(Color.Red);
		});
	});

	describe('styleFg / styleBg', () => {
		it('sets fg color', () => {
			const s = styleFg(createStyle(), Color.Red);
			expect(s.fg).toEqual(Color.Red);
		});

		it('sets bg color', () => {
			const s = styleBg(createStyle(), Color.Blue);
			expect(s.bg).toEqual(Color.Blue);
		});
	});

	describe('styleAddModifier / styleSubModifier', () => {
		it('adds modifier to addModifier', () => {
			const s = styleAddModifier(createStyle(), Modifier.BOLD);
			expect(Modifier.contains(s.addModifier, Modifier.BOLD)).toBe(true);
		});

		it('adds modifier to subModifier', () => {
			const s = styleSubModifier(createStyle(), Modifier.ITALIC);
			expect(Modifier.contains(s.subModifier, Modifier.ITALIC)).toBe(true);
		});
	});

	describe('patchStyle', () => {
		it('merges fg/bg from patch', () => {
			const base = styleFg(createStyle(), Color.Red);
			const patch = styleBg(createStyle(), Color.Blue);
			const merged = patchStyle(base, patch);
			expect(merged.fg).toEqual(Color.Red);
			expect(merged.bg).toEqual(Color.Blue);
		});

		it('patch fg overrides base fg', () => {
			const base = styleFg(createStyle(), Color.Red);
			const patch = styleFg(createStyle(), Color.Green);
			const merged = patchStyle(base, patch);
			expect(merged.fg).toEqual(Color.Green);
		});

		it('composes modifiers', () => {
			const base = styleAddModifier(createStyle(), Modifier.BOLD);
			const patch = styleAddModifier(createStyle(), Modifier.ITALIC);
			const merged = patchStyle(base, patch);
			expect(Modifier.contains(merged.addModifier, Modifier.BOLD)).toBe(true);
			expect(Modifier.contains(merged.addModifier, Modifier.ITALIC)).toBe(true);
		});
	});

	describe('resetStyle', () => {
		it('returns fully reset style', () => {
			const s = resetStyle();
			expect(s.fg).toEqual(Color.Reset);
			expect(s.bg).toEqual(Color.Reset);
			expect(s.underlineColor).toEqual(Color.Reset);
			expect(s.addModifier).toBe(0);
			expect(s.subModifier).toBe(0);
		});
	});
});

// ---------------------------------------------------------------------------
// layout.ts
// ---------------------------------------------------------------------------

describe('layout', () => {
	describe('createPosition', () => {
		it('creates a position', () => {
			expect(createPosition(5, 10)).toEqual({ x: 5, y: 10 });
		});
	});

	describe('createSize', () => {
		it('creates a size', () => {
			expect(createSize(80, 24)).toEqual({ width: 80, height: 24 });
		});
	});

	describe('createMargin', () => {
		it('creates symmetric margin', () => {
			expect(createMargin(1, 2)).toEqual({ top: 1, right: 2, bottom: 1, left: 2 });
		});
	});

	describe('uniformMargin', () => {
		it('creates uniform margin', () => {
			expect(uniformMargin(3)).toEqual({ top: 3, right: 3, bottom: 3, left: 3 });
		});
	});

	describe('noMargin', () => {
		it('creates zero margin', () => {
			expect(noMargin()).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
		});
	});

	describe('EMPTY_RECT', () => {
		it('is a zero rect', () => {
			expect(EMPTY_RECT).toEqual({ x: 0, y: 0, width: 0, height: 0 });
		});
	});

	describe('createRect', () => {
		it('creates a rect', () => {
			expect(createRect(0, 0, 80, 24)).toEqual({ x: 0, y: 0, width: 80, height: 24 });
		});

		it('clamps negative values to 0', () => {
			const r = createRect(-1, -1, 100, 100);
			expect(r.x).toBe(0);
			expect(r.y).toBe(0);
		});
	});

	describe('rect accessors', () => {
		const r = createRect(5, 10, 20, 15);

		it('rectArea', () => {
			expect(rectArea(r)).toBe(300);
		});

		it('rectIsEmpty for non-empty rect', () => {
			expect(rectIsEmpty(r)).toBe(false);
		});

		it('rectIsEmpty for zero-width rect', () => {
			expect(rectIsEmpty(createRect(0, 0, 0, 5))).toBe(true);
		});

		it('rectIsEmpty for zero-height rect', () => {
			expect(rectIsEmpty(createRect(0, 0, 5, 0))).toBe(true);
		});

		it('rectLeft/Right/Top/Bottom', () => {
			expect(rectLeft(r)).toBe(5);
			expect(rectRight(r)).toBe(25);
			expect(rectTop(r)).toBe(10);
			expect(rectBottom(r)).toBe(25);
		});
	});

	describe('rectContains', () => {
		const r = createRect(5, 5, 10, 10);

		it('point inside', () => {
			expect(rectContains(r, createPosition(5, 5))).toBe(true);
			expect(rectContains(r, createPosition(10, 10))).toBe(true);
		});

		it('point outside', () => {
			expect(rectContains(r, createPosition(4, 5))).toBe(false);
			expect(rectContains(r, createPosition(15, 5))).toBe(false);
			expect(rectContains(r, createPosition(5, 15))).toBe(false);
		});
	});

	describe('rectInner', () => {
		it('shrinks by margin', () => {
			const r = createRect(0, 0, 20, 10);
			const inner = rectInner(r, createMargin(1, 2));
			expect(inner).toEqual({ x: 2, y: 1, width: 16, height: 8 });
		});

		it('returns EMPTY_RECT if margin too large', () => {
			const r = createRect(0, 0, 4, 4);
			expect(rectInner(r, uniformMargin(3))).toEqual(EMPTY_RECT);
		});
	});

	describe('rectOuter', () => {
		it('expands by margin', () => {
			const r = createRect(5, 5, 10, 10);
			const outer = rectOuter(r, uniformMargin(1));
			expect(outer).toEqual({ x: 4, y: 4, width: 12, height: 12 });
		});
	});

	describe('rectIntersection', () => {
		it('overlapping rects', () => {
			const a = createRect(0, 0, 10, 10);
			const b = createRect(5, 5, 10, 10);
			expect(rectIntersection(a, b)).toEqual({ x: 5, y: 5, width: 5, height: 5 });
		});

		it('non-overlapping rects', () => {
			const a = createRect(0, 0, 5, 5);
			const b = createRect(10, 10, 5, 5);
			expect(rectIntersection(a, b)).toEqual(EMPTY_RECT);
		});
	});

	describe('rectUnion', () => {
		it('computes bounding box', () => {
			const a = createRect(0, 0, 5, 5);
			const b = createRect(3, 3, 5, 5);
			expect(rectUnion(a, b)).toEqual({ x: 0, y: 0, width: 8, height: 8 });
		});
	});

	describe('rectRows', () => {
		it('splits into rows', () => {
			const rows = rectRows(createRect(0, 0, 10, 3));
			expect(rows).toHaveLength(3);
			expect(rows[0]).toEqual({ x: 0, y: 0, width: 10, height: 1 });
			expect(rows[2]).toEqual({ x: 0, y: 2, width: 10, height: 1 });
		});
	});

	describe('rectColumns', () => {
		it('splits into columns', () => {
			const cols = rectColumns(createRect(0, 0, 4, 10));
			expect(cols).toHaveLength(4);
			expect(cols[0]).toEqual({ x: 0, y: 0, width: 1, height: 10 });
			expect(cols[3]).toEqual({ x: 3, y: 0, width: 1, height: 10 });
		});
	});

	describe('rectPositions', () => {
		it('returns all positions in a 2x2 rect', () => {
			const positions = rectPositions(createRect(0, 0, 2, 2));
			expect(positions).toHaveLength(4);
			expect(positions).toContainEqual({ x: 0, y: 0 });
			expect(positions).toContainEqual({ x: 1, y: 0 });
			expect(positions).toContainEqual({ x: 0, y: 1 });
			expect(positions).toContainEqual({ x: 1, y: 1 });
		});
	});

	describe('constraint factories', () => {
		it('minConstraint', () => {
			expect(minConstraint(5)).toEqual({ type: 'min', value: 5 });
		});

		it('maxConstraint', () => {
			expect(maxConstraint(10)).toEqual({ type: 'max', value: 10 });
		});

		it('lengthConstraint', () => {
			expect(lengthConstraint(10)).toEqual({ type: 'length', value: 10 });
		});

		it('percentageConstraint', () => {
			expect(percentageConstraint(50)).toEqual({ type: 'percentage', value: 50 });
		});

		it('ratioConstraint', () => {
			expect(ratioConstraint(1, 3)).toEqual({ type: 'ratio', numerator: 1, denominator: 3 });
		});

		it('fillConstraint', () => {
			expect(fillConstraint(1)).toEqual({ type: 'fill', value: 1 });
		});
	});

	describe('applyConstraint', () => {
		it('length returns the value', () => {
			expect(applyConstraint(lengthConstraint(10), 100)).toBe(10);
		});

		it('percentage returns proportional value', () => {
			expect(applyConstraint(percentageConstraint(50), 100)).toBe(50);
		});

		it('ratio computes correctly', () => {
			expect(applyConstraint(ratioConstraint(1, 4), 100)).toBe(25);
		});

		it('min returns max of value and length', () => {
			expect(applyConstraint(minConstraint(20), 10)).toBe(20);
			expect(applyConstraint(minConstraint(5), 10)).toBe(10);
		});

		it('max returns min of value and length', () => {
			expect(applyConstraint(maxConstraint(5), 10)).toBe(5);
			expect(applyConstraint(maxConstraint(20), 10)).toBe(10);
		});
	});

	describe('splitLayout', () => {
		it('vertical with 3 length constraints', () => {
			const layout = createLayout([lengthConstraint(5), lengthConstraint(10), lengthConstraint(5)]);
			const rects = splitLayout(layout, createRect(0, 0, 80, 24));
			expect(rects).toHaveLength(3);
			expect(rects[0]).toEqual({ x: 0, y: 0, width: 80, height: 5 });
			expect(rects[1]).toEqual({ x: 0, y: 5, width: 80, height: 10 });
			expect(rects[2]).toEqual({ x: 0, y: 15, width: 80, height: 5 });
		});

		it('horizontal direction', () => {
			const layout = createLayout(
				[lengthConstraint(20), lengthConstraint(60)],
				{ direction: 'horizontal' },
			);
			const rects = splitLayout(layout, createRect(0, 0, 80, 24));
			expect(rects).toHaveLength(2);
			expect(rects[0]).toEqual({ x: 0, y: 0, width: 20, height: 24 });
			expect(rects[1]).toEqual({ x: 20, y: 0, width: 60, height: 24 });
		});

		it('fill constraints distribute remaining space', () => {
			const layout = createLayout([lengthConstraint(10), fillConstraint(1), fillConstraint(1)]);
			const rects = splitLayout(layout, createRect(0, 0, 80, 30));
			expect(rects).toHaveLength(3);
			expect(rects[0]!.height).toBe(10);
			// Remaining 20 split evenly
			expect(rects[1]!.height).toBe(10);
			expect(rects[2]!.height).toBe(10);
		});

		it('with margin applied', () => {
			const layout = createLayout(
				[fillConstraint(1)],
				{ margin: uniformMargin(2) },
			);
			const rects = splitLayout(layout, createRect(0, 0, 80, 24));
			expect(rects).toHaveLength(1);
			expect(rects[0]).toEqual({ x: 2, y: 2, width: 76, height: 20 });
		});

		it('empty constraints returns empty array', () => {
			const layout = createLayout([]);
			expect(splitLayout(layout, createRect(0, 0, 80, 24))).toEqual([]);
		});
	});
});

// ---------------------------------------------------------------------------
// buffer.ts
// ---------------------------------------------------------------------------

describe('buffer', () => {
	describe('createCell', () => {
		it('returns default cell', () => {
			const c = createCell();
			expect(c.symbol).toBe(' ');
			expect(c.fg).toEqual(Color.Reset);
			expect(c.bg).toEqual(Color.Reset);
			expect(c.modifier).toBe(0);
		});

		it('accepts overrides', () => {
			const c = createCell({ symbol: 'X' });
			expect(c.symbol).toBe('X');
		});
	});

	describe('cellSetSymbol', () => {
		it('returns new cell with updated symbol', () => {
			const c = cellSetSymbol(createCell(), 'Y');
			expect(c.symbol).toBe('Y');
		});
	});

	describe('cellSetStyle', () => {
		it('applies style fg/bg/modifier', () => {
			const style = styleAddModifier(styleFg(createStyle(), Color.Red), Modifier.BOLD);
			const c = cellSetStyle(createCell(), style);
			expect(c.fg).toEqual(Color.Red);
			expect(Modifier.contains(c.modifier, Modifier.BOLD)).toBe(true);
		});
	});

	describe('cellReset', () => {
		it('resets to default cell', () => {
			const c = cellReset(createCell({ symbol: 'X' }));
			expect(c.symbol).toBe(' ');
			expect(c.modifier).toBe(0);
		});
	});

	describe('charWidth', () => {
		it('returns 1 for ASCII', () => {
			expect(charWidth(65)).toBe(1); // 'A'
		});

		it('returns 2 for CJK', () => {
			expect(charWidth(0x4e00)).toBe(2);
		});

		it('returns 0 for null char', () => {
			expect(charWidth(0)).toBe(0);
		});

		it('returns 2 for emoji presentation characters', () => {
			expect(charWidth(0x25b6)).toBe(2); // ▶
			expect(charWidth(0x25c0)).toBe(2); // ◀
			expect(charWidth(0x231a)).toBe(2); // ⌚
			expect(charWidth(0x2614)).toBe(2); // ☔
			expect(charWidth(0x2705)).toBe(2); // ✅
		});

		it('returns 1 for non-emoji symbols', () => {
			expect(charWidth(0x276f)).toBe(1); // ❯
			expect(charWidth(0x2500)).toBe(1); // ─ (box drawing)
		});
	});

	describe('cellWidth', () => {
		it('returns 1 for ASCII cell', () => {
			expect(cellWidth(createCell({ symbol: 'A' }))).toBe(1);
		});

		it('returns 2 for wide char cell', () => {
			expect(cellWidth(createCell({ symbol: '中' }))).toBe(2);
		});

		it('returns 0 for empty symbol', () => {
			expect(cellWidth(createCell({ symbol: '' }))).toBe(0);
		});
	});

	describe('createBuffer', () => {
		it('creates buffer with correct size', () => {
			const buf = createBuffer(createRect(0, 0, 10, 5));
			expect(buf.content).toHaveLength(50);
			expect(buf.area).toEqual({ x: 0, y: 0, width: 10, height: 5 });
		});
	});

	describe('bufferIndex', () => {
		it('computes correct index', () => {
			const buf = createBuffer(createRect(0, 0, 10, 5));
			expect(bufferIndex(buf, 3, 2)).toBe(23); // 2*10 + 3
		});

		it('handles non-zero origin', () => {
			const buf = createBuffer(createRect(5, 5, 10, 5));
			expect(bufferIndex(buf, 5, 5)).toBe(0);
			expect(bufferIndex(buf, 6, 5)).toBe(1);
		});
	});

	describe('bufferCell', () => {
		it('returns cell at position', () => {
			const buf = createBuffer(createRect(0, 0, 10, 5));
			const cell = bufferCell(buf, 0, 0);
			expect(cell).toBeDefined();
			expect(cell!.symbol).toBe(' ');
		});

		it('returns undefined for out of bounds', () => {
			const buf = createBuffer(createRect(0, 0, 10, 5));
			expect(bufferCell(buf, 10, 0)).toBeUndefined();
			expect(bufferCell(buf, 0, 5)).toBeUndefined();
		});
	});

	describe('bufferSetCell', () => {
		it('sets cell at position', () => {
			const buf = createBuffer(createRect(0, 0, 10, 5));
			const cell = createCell({ symbol: 'X' });
			bufferSetCell(buf, 3, 2, cell);
			expect(bufferCell(buf, 3, 2)!.symbol).toBe('X');
		});

		it('no-op for out of bounds', () => {
			const buf = createBuffer(createRect(0, 0, 10, 5));
			bufferSetCell(buf, 20, 20, createCell({ symbol: 'X' }));
			// Should not throw
		});
	});

	describe('bufferSetString', () => {
		it('writes characters with style', () => {
			const buf = createBuffer(createRect(0, 0, 10, 5));
			const style = styleFg(createStyle(), Color.Red);
			bufferSetString(buf, 0, 0, 'Hi', style);
			expect(bufferCell(buf, 0, 0)!.symbol).toBe('H');
			expect(bufferCell(buf, 1, 0)!.symbol).toBe('i');
			expect(bufferCell(buf, 0, 0)!.fg).toEqual(Color.Red);
		});
	});

	describe('bufferSetStyle', () => {
		it('applies style to area', () => {
			const buf = createBuffer(createRect(0, 0, 10, 5));
			const style = styleFg(createStyle(), Color.Green);
			bufferSetStyle(buf, createRect(0, 0, 2, 2), style);
			expect(bufferCell(buf, 0, 0)!.fg).toEqual(Color.Green);
			expect(bufferCell(buf, 1, 1)!.fg).toEqual(Color.Green);
			// Outside area is unchanged
			expect(bufferCell(buf, 2, 2)!.fg).toEqual(Color.Reset);
		});
	});

	describe('bufferSetLine', () => {
		it('writes a line of spans', () => {
			const buf = createBuffer(createRect(0, 0, 20, 1));
			// Inline object matching buffer.ts's Line interface (distinct from text.ts Line)
			const bufLine = {
				spans: [
					{ content: 'AB', style: createStyle() },
					{ content: 'CD', style: styleFg(createStyle(), Color.Red) },
				],
			};
			bufferSetLine(buf, 0, 0, bufLine, 20, createStyle());
			expect(bufferCell(buf, 0, 0)!.symbol).toBe('A');
			expect(bufferCell(buf, 2, 0)!.symbol).toBe('C');
			expect(bufferCell(buf, 2, 0)!.fg).toEqual(Color.Red);
		});
	});

	describe('bufferDiff', () => {
		it('returns changed cells', () => {
			const area = createRect(0, 0, 5, 1);
			const prev = createBuffer(area);
			const next = createBuffer(area);
			bufferSetString(next, 0, 0, 'X', createStyle());
			const diffs = bufferDiff(prev, next);
			expect(diffs.length).toBeGreaterThan(0);
			expect(diffs[0]!.cell.symbol).toBe('X');
		});

		it('returns empty for identical buffers', () => {
			const area = createRect(0, 0, 5, 1);
			const a = createBuffer(area);
			const b = createBuffer(area);
			expect(bufferDiff(a, b)).toHaveLength(0);
		});
	});

	describe('bufferMerge', () => {
		it('copies cells from src to dest', () => {
			const area = createRect(0, 0, 5, 1);
			const dest = createBuffer(area);
			const src = createBuffer(area);
			bufferSetString(src, 0, 0, 'Hi', createStyle());
			bufferMerge(dest, src);
			expect(bufferCell(dest, 0, 0)!.symbol).toBe('H');
			expect(bufferCell(dest, 1, 0)!.symbol).toBe('i');
		});
	});
});

// ---------------------------------------------------------------------------
// text.ts
// ---------------------------------------------------------------------------

describe('text', () => {
	describe('isWideChar', () => {
		it('returns true for CJK', () => {
			expect(isWideChar(0x4e00)).toBe(true);
		});

		it('returns false for ASCII', () => {
			expect(isWideChar(65)).toBe(false);
		});

		it('returns true for emoji presentation characters', () => {
			expect(isWideChar(0x25b6)).toBe(true); // ▶
			expect(isWideChar(0x25c0)).toBe(true); // ◀
			expect(isWideChar(0x231a)).toBe(true); // ⌚
			expect(isWideChar(0x2728)).toBe(true); // ✨
			expect(isWideChar(0x1f600)).toBe(true); // 😀
		});

		it('returns false for non-emoji symbols', () => {
			expect(isWideChar(0x276f)).toBe(false); // ❯
			expect(isWideChar(0x2500)).toBe(false); // ─ (box drawing)
		});
	});

	describe('stringWidth', () => {
		it('returns correct width for ASCII', () => {
			expect(stringWidth('hello')).toBe(5);
		});

		it('returns correct width for wide chars', () => {
			expect(stringWidth('你好')).toBe(4);
		});

		it('returns 0 for empty string', () => {
			expect(stringWidth('')).toBe(0);
		});

		it('returns correct width for emoji symbols', () => {
			expect(stringWidth('▶ ')).toBe(3); // ▶ is 2-wide + space
			expect(stringWidth('❯ ')).toBe(2); // ❯ is 1-wide + space
		});
	});

	describe('Span', () => {
		it('rawSpan has default style', () => {
			const s = rawSpan('test');
			expect(s.content).toBe('test');
			expect(s.style.addModifier).toBe(0);
			expect(s.style.fg).toBeUndefined();
		});

		it('styledSpan has given style', () => {
			const style = styleFg(createStyle(), Color.Red);
			const s = styledSpan('test', style);
			expect(s.style.fg).toEqual(Color.Red);
		});

		it('createSpan with no style uses default', () => {
			const s = createSpan('abc');
			expect(s.content).toBe('abc');
			expect(s.style.addModifier).toBe(0);
		});

		it('spanWidth for normal chars', () => {
			expect(spanWidth(rawSpan('hello'))).toBe(5);
		});

		it('spanWidth for wide chars', () => {
			expect(spanWidth(rawSpan('你好'))).toBe(4);
		});

		it('spanPatchStyle patches the style', () => {
			const s = rawSpan('x');
			const patched = spanPatchStyle(s, styleFg(createStyle(), Color.Blue));
			expect(patched.style.fg).toEqual(Color.Blue);
			expect(patched.content).toBe('x');
		});
	});

	describe('Line', () => {
		it('rawLine creates line with one span', () => {
			const l = rawLine('hello');
			expect(l.spans).toHaveLength(1);
			expect(l.spans[0]!.content).toBe('hello');
		});

		it('lineWidth sums span widths', () => {
			const l = rawLine('hello');
			expect(lineWidth(l)).toBe(5);
		});

		it('lineHeight always returns 1', () => {
			expect(lineHeight()).toBe(1);
		});

		it('linePushSpan appends a span', () => {
			const l = rawLine('a');
			const l2 = linePushSpan(l, rawSpan('b'));
			expect(l2.spans).toHaveLength(2);
			expect(l2.spans[1]!.content).toBe('b');
		});

		it('lineAlignment sets alignment', () => {
			const l = rawLine('hello');
			const centered = lineAlignment(l, 'center');
			expect(centered.alignment).toBe('center');
		});

		it('styledLine applies style', () => {
			const style = styleFg(createStyle(), Color.Red);
			const l = styledLine('test', style);
			expect(l.spans[0]!.style.fg).toEqual(Color.Red);
			expect(l.style.fg).toEqual(Color.Red);
		});

		it('linePatchStyle patches all spans', () => {
			const l = rawLine('hi');
			const patched = linePatchStyle(l, styleFg(createStyle(), Color.Green));
			expect(patched.spans[0]!.style.fg).toEqual(Color.Green);
		});
	});

	describe('Text', () => {
		it('rawText creates lines by splitting newlines', () => {
			const t = rawText('hello\nworld');
			expect(t.lines).toHaveLength(2);
			expect(t.lines[0]!.spans[0]!.content).toBe('hello');
			expect(t.lines[1]!.spans[0]!.content).toBe('world');
		});

		it('textWidth returns widest line', () => {
			const t = rawText('hi\nhello');
			expect(textWidth(t)).toBe(5);
		});

		it('textHeight returns number of lines', () => {
			const t = rawText('a\nb\nc');
			expect(textHeight(t)).toBe(3);
		});

		it('textPushLine appends a line', () => {
			const t = rawText('a');
			const t2 = textPushLine(t, rawLine('b'));
			expect(textHeight(t2)).toBe(2);
		});

		it('textPushSpan appends span to last line', () => {
			const t = rawText('a');
			const t2 = textPushSpan(t, rawSpan('b'));
			expect(t2.lines[0]!.spans).toHaveLength(2);
			expect(t2.lines[0]!.spans[1]!.content).toBe('b');
		});

		it('createText with overrides', () => {
			const t = createText([rawLine('x')], { alignment: 'right' });
			expect(t.alignment).toBe('right');
		});

		it('styledText applies style to all lines', () => {
			const style = styleFg(createStyle(), Color.Red);
			const t = styledText('a\nb', style);
			expect(t.lines[0]!.spans[0]!.style.fg).toEqual(Color.Red);
			expect(t.lines[1]!.spans[0]!.style.fg).toEqual(Color.Red);
		});

		it('textPatchStyle patches all lines', () => {
			const t = rawText('a\nb');
			const patched = textPatchStyle(t, styleFg(createStyle(), Color.Blue));
			expect(patched.lines[0]!.spans[0]!.style.fg).toEqual(Color.Blue);
			expect(patched.lines[1]!.spans[0]!.style.fg).toEqual(Color.Blue);
		});
	});
});

// ---------------------------------------------------------------------------
// terminal.ts + backends/test.ts
// ---------------------------------------------------------------------------

describe('terminal', () => {
	const makeTerminal = (w = 80, h = 24) => {
		const state = createTestBackendState(w, h);
		const backend = createTestBackend(state);
		const terminal = createTerminal(backend);
		return { state, terminal };
	};

	it('createTerminal with test backend has correct viewport', () => {
		const { terminal } = makeTerminal(80, 24);
		expect(terminal.viewport).toBe('fullscreen');
		expect(terminal.viewportArea).toEqual({ x: 0, y: 0, width: 80, height: 24 });
	});

	it('terminalDraw returns CompletedFrame', () => {
		const { terminal } = makeTerminal(10, 5);
		const result = terminalDraw(terminal, () => {});
		expect(result.area).toEqual({ x: 0, y: 0, width: 10, height: 5 });
		expect(result.buffer).toBeDefined();
	});

	it('terminalDraw increments frameCount', () => {
		const { terminal } = makeTerminal();
		expect(terminal.frameCount).toBe(0);
		terminalDraw(terminal, () => {});
		expect(terminal.frameCount).toBe(1);
		terminalDraw(terminal, () => {});
		expect(terminal.frameCount).toBe(2);
	});

	it('frameRenderWidget calls the widget renderer', () => {
		const { terminal } = makeTerminal(10, 5);
		let called = false;
		terminalDraw(terminal, (frame) => {
			frameRenderWidget(frame, (area, buf) => {
				called = true;
				bufferSetString(buf, area.x, area.y, 'Hi', createStyle());
			}, frame.area);
		});
		expect(called).toBe(true);
	});

	it('frameSetCursorPosition sets cursor on frame', () => {
		const { terminal, state } = makeTerminal(10, 5);
		terminalDraw(terminal, (frame) => {
			frameSetCursorPosition(frame, createPosition(3, 2));
		});
		expect(state.cursorPosition).toEqual({ x: 3, y: 2 });
		expect(state.cursorVisible).toBe(true);
	});

	it('terminalResize resizes both buffers', () => {
		const { terminal } = makeTerminal(10, 5);
		terminalResize(terminal, createSize(20, 10));
		expect(terminal.viewportArea).toEqual({ x: 0, y: 0, width: 20, height: 10 });
		expect(terminal.buffers[0].content).toHaveLength(200);
		expect(terminal.buffers[1].content).toHaveLength(200);
	});

	it('double-buffered rendering diffs correctly', () => {
		const { terminal, state } = makeTerminal(5, 1);

		// First frame: write 'A' at (0,0)
		terminalDraw(terminal, (frame) => {
			bufferSetString(frame.buffer, 0, 0, 'A', createStyle());
		});

		// Second frame: write 'B' at (0,0) — diff should detect change
		terminalDraw(terminal, (frame) => {
			bufferSetString(frame.buffer, 0, 0, 'B', createStyle());
		});

		// The test backend should show 'B' at (0,0)
		const row = state.buffer[0];
		expect(row).toBeDefined();
		expect(row![0]!.symbol).toBe('B');
	});
});

// ---------------------------------------------------------------------------
// symbols.ts
// ---------------------------------------------------------------------------

describe('symbols', () => {
	it('border.PLAIN.topLeft', () => {
		expect(border.PLAIN.topLeft).toBe('┌');
	});

	it('border.ROUNDED.topLeft', () => {
		expect(border.ROUNDED.topLeft).toBe('╭');
	});

	it('border.DOUBLE.topLeft', () => {
		expect(border.DOUBLE.topLeft).toBe('╔');
	});

	it('bar.NINE_LEVELS.full', () => {
		expect(bar.NINE_LEVELS.full).toBe('█');
	});

	it('line.NORMAL.horizontal', () => {
		expect(line.NORMAL.horizontal).toBe('─');
	});

	it('scrollbar.VERTICAL.thumb', () => {
		expect(scrollbar.VERTICAL.thumb).toBe('█');
	});

	it('shade.FULL', () => {
		expect(shade.FULL).toBe('█');
	});

	it('BRAILLE_OFFSET', () => {
		expect(BRAILLE_OFFSET).toBe(0x2800);
	});
});
