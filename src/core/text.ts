import { isWideChar } from './charwidth';
import type { Alignment } from './layout';
import type { Style } from './style';
import { createStyle, patchStyle } from './style';

const stringWidth = (str: string): number => {
	let width = 0;
	for (const char of str) {
		const code = char.codePointAt(0) ?? 0;
		if (isWideChar(code)) {
			width += 2;
		} else {
			width += 1;
		}
	}
	return width;
};

// Span

interface Span {
	readonly content: string;
	readonly style: Style;
}

const createSpan = (content: string, style?: Style): Span => ({
	content,
	style: style ?? createStyle(),
});

const rawSpan = (content: string): Span => ({
	content,
	style: createStyle(),
});

const styledSpan = (content: string, style: Style): Span => ({
	content,
	style,
});

const spanWidth = (span: Span): number => stringWidth(span.content);

const spanPatchStyle = (span: Span, style: Style): Span => ({
	content: span.content,
	style: patchStyle(span.style, style),
});

// Line

interface Line {
	readonly spans: readonly Span[];
	readonly style: Style;
	readonly alignment?: Alignment;
}

const createLine = (
	spans: readonly Span[],
	overrides?: { readonly style?: Style; readonly alignment?: Alignment },
): Line => {
	const style = overrides?.style ?? createStyle();
	const alignment = overrides?.alignment;
	if (alignment !== undefined) {
		return { spans, style, alignment };
	}
	return { spans, style };
};

const rawLine = (content: string): Line => ({
	spans: [rawSpan(content)],
	style: createStyle(),
});

const styledLine = (content: string, style: Style): Line => ({
	spans: [styledSpan(content, style)],
	style,
});

const lineWidth = (line: Line): number => {
	let width = 0;
	for (const span of line.spans) {
		width += spanWidth(span);
	}
	return width;
};

const lineHeight = (): number => 1;

const linePatchStyle = (line: Line, style: Style): Line => {
	const patchedSpans = line.spans.map((span) => spanPatchStyle(span, style));
	const patchedStyle = patchStyle(line.style, style);
	if (line.alignment !== undefined) {
		return { spans: patchedSpans, style: patchedStyle, alignment: line.alignment };
	}
	return { spans: patchedSpans, style: patchedStyle };
};

const linePushSpan = (line: Line, span: Span): Line => {
	const spans = [...line.spans, span];
	if (line.alignment !== undefined) {
		return { spans, style: line.style, alignment: line.alignment };
	}
	return { spans, style: line.style };
};

const lineAlignment = (line: Line, alignment: Alignment): Line => ({
	spans: line.spans,
	style: line.style,
	alignment,
});

// Text

interface Text {
	readonly lines: readonly Line[];
	readonly style: Style;
	readonly alignment: Alignment;
}

const createText = (
	lines: readonly Line[],
	overrides?: { readonly style?: Style; readonly alignment?: Alignment },
): Text => ({
	lines,
	style: overrides?.style ?? createStyle(),
	alignment: overrides?.alignment ?? 'left',
});

const rawText = (content: string): Text => {
	const lines = content.split('\n').map((s) => rawLine(s));
	return { lines, style: createStyle(), alignment: 'left' };
};

const styledText = (content: string, style: Style): Text => {
	const lines = content.split('\n').map((s) => styledLine(s, style));
	return { lines, style, alignment: 'left' };
};

const textWidth = (text: Text): number => {
	let max = 0;
	for (const line of text.lines) {
		const w = lineWidth(line);
		if (w > max) {
			max = w;
		}
	}
	return max;
};

const textHeight = (text: Text): number => text.lines.length;

const textPatchStyle = (text: Text, style: Style): Text => ({
	lines: text.lines.map((line) => linePatchStyle(line, style)),
	style: patchStyle(text.style, style),
	alignment: text.alignment,
});

const textPushLine = (text: Text, line: Line): Text => ({
	lines: [...text.lines, line],
	style: text.style,
	alignment: text.alignment,
});

const textPushSpan = (text: Text, span: Span): Text => {
	if (text.lines.length === 0) {
		const newLine = createLine([span]);
		return { lines: [newLine], style: text.style, alignment: text.alignment };
	}
	const lastIndex = text.lines.length - 1;
	const lastLine = text.lines[lastIndex];
	if (!lastLine) {
		const newLine = createLine([span]);
		return { lines: [newLine], style: text.style, alignment: text.alignment };
	}
	const updatedLine = linePushSpan(lastLine, span);
	const lines = [...text.lines.slice(0, lastIndex), updatedLine];
	return { lines, style: text.style, alignment: text.alignment };
};

export type { Span, Line, Text };
export {
	isWideChar,
	stringWidth,
	createSpan,
	rawSpan,
	styledSpan,
	spanWidth,
	spanPatchStyle,
	createLine,
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
};
