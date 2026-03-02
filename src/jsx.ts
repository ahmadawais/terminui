import type { Alignment, Constraint, Margin, Rect, Spacing } from './core/layout';
import { createLayout, createPosition, fillConstraint, splitLayout } from './core/layout';
import type { CompletedFrame, Frame, Terminal } from './core/terminal';
import {
	frameRenderStatefulWidget,
	frameRenderWidget,
	frameSetCursorPosition,
	terminalDraw,
} from './core/terminal';
import type { Style } from './core/style';
import {
	Modifier,
	createStyle,
	styleAddModifier,
	styleBg,
	styleFg,
} from './core/style';
import type { Line, Text as RichText } from './core/text';
import type { JsxComponent, JsxElement, JsxNode, JsxProps } from './jsx-runtime';
import { Fragment } from './jsx-runtime';
import type { BarChartConfig, BarGroup } from './widgets/barchart';
import { createBarChart as createBarChartWidget, renderBarChart } from './widgets/barchart';
import type { BlockConfig, Title } from './widgets/block';
import {
	Borders,
	blockBordered,
	blockInner,
	createBlock,
	createPadding,
	createTitle,
	renderBlock,
} from './widgets/block';
import { renderClear } from './widgets/clear';
import type { GaugeConfig, LineGaugeConfig } from './widgets/gauge';
import {
	createGauge as createGaugeWidget,
	createLineGauge as createLineGaugeWidget,
	gaugePercent,
	renderGauge,
	renderLineGauge,
} from './widgets/gauge';
import type { ListConfig, ListItem, ListState } from './widgets/list';
import {
	createList as createListWidget,
	renderList,
	renderStatefulList,
} from './widgets/list';
import type { ParagraphConfig } from './widgets/paragraph';
import {
	createParagraph as createParagraphWidget,
	renderParagraph,
} from './widgets/paragraph';
import type { ScrollbarConfig, ScrollbarOrientation, ScrollbarState } from './widgets/scrollbar';
import {
	createScrollbar as createScrollbarWidget,
	renderStatefulScrollbar,
} from './widgets/scrollbar';
import type { SparklineConfig } from './widgets/sparkline';
import { createSparkline as createSparklineWidget, renderSparkline } from './widgets/sparkline';
import type { TableCell, TableConfig, TableState, Row as TableRow } from './widgets/table';
import {
	createRow as createTableRowWidget,
	createTable as createTableWidget,
	renderStatefulTable,
	renderTable,
} from './widgets/table';
import type { TabsConfig } from './widgets/tabs';
import { createTabs as createTabsWidget, renderTabs } from './widgets/tabs';

interface StackProps {
	readonly constraints?: readonly Constraint[];
	readonly margin?: Margin;
	readonly spacing?: Spacing | number;
	readonly gap?: number;
	readonly children?: JsxNode;
}

interface StyleShorthands {
	readonly fg?: Style['fg'];
	readonly bg?: Style['bg'];
	readonly bold?: boolean;
}

interface BlockShorthands {
	readonly border?: boolean;
	readonly title?: string | Title | readonly (string | Title)[];
	readonly p?: number;
	readonly px?: number;
	readonly py?: number;
}

interface BoxProps extends Partial<BlockConfig>, StyleShorthands, BlockShorthands {
	readonly bordered?: boolean;
	readonly children?: JsxNode;
}

interface TextProps
	extends Partial<Omit<ParagraphConfig, 'text'>>,
		StyleShorthands,
		BlockShorthands {
	readonly text?: RichText | string;
	readonly align?: Alignment;
	readonly children?: JsxNode;
}

interface ListProps extends Partial<Omit<ListConfig, 'items'>>, StyleShorthands, BlockShorthands {
	readonly items: readonly (string | ListItem)[];
	readonly state?: ListState;
}

type TableRowInput = TableRow | readonly (string | TableCell)[];

interface TableProps
	extends Partial<Omit<TableConfig, 'rows' | 'widths' | 'header' | 'footer'>>,
		StyleShorthands,
		BlockShorthands {
	readonly rows: readonly TableRowInput[];
	readonly widths: readonly Constraint[];
	readonly header?: TableRowInput;
	readonly footer?: TableRowInput;
	readonly state?: TableState;
}

interface GaugeProps extends Partial<GaugeConfig>, StyleShorthands, BlockShorthands {
	readonly percent?: number;
}

interface LineGaugeProps extends Partial<LineGaugeConfig>, StyleShorthands, BlockShorthands {
	readonly percent?: number;
}

interface TabsProps extends Partial<Omit<TabsConfig, 'titles'>>, StyleShorthands, BlockShorthands {
	readonly titles: readonly (string | Line)[];
}

interface SparklineProps
	extends Partial<Omit<SparklineConfig, 'data'>>,
		StyleShorthands,
		BlockShorthands {
	readonly data: readonly number[];
}

interface BarChartProps extends Partial<Omit<BarChartConfig, 'data'>>, StyleShorthands, BlockShorthands {
	readonly data: readonly BarGroup[];
}

interface ScrollbarProps extends Partial<Omit<ScrollbarConfig, 'orientation'>>, StyleShorthands {
	readonly orientation: ScrollbarOrientation;
	readonly state: ScrollbarState;
}

interface CursorProps {
	readonly x: number;
	readonly y: number;
	readonly absolute?: boolean;
}

type TerminalDrawJsxRoot = JsxNode | ((frame: Frame) => JsxNode);

interface TerminalLoopJsxOptions {
	readonly maxFrames?: number;
	readonly continueWhile?: (frameCount: number) => boolean;
}

interface TerminalLoopJsxResult {
	readonly frames: number;
	readonly last?: CompletedFrame;
}

const intrinsic = (type: string, props: unknown): JsxElement => ({
	type,
	props,
	key: null,
});

const VStack: JsxComponent<StackProps> = (props) => intrinsic('vstack', props);
const HStack: JsxComponent<StackProps> = (props) => intrinsic('hstack', props);
const Column: JsxComponent<StackProps> = (props) => intrinsic('column', props);
const Row: JsxComponent<StackProps> = (props) => intrinsic('row', props);
const Box: JsxComponent<BoxProps> = (props) => intrinsic('box', props);
const Panel: JsxComponent<BoxProps> = (props) => intrinsic('panel', props);
const Text: JsxComponent<TextProps> = (props) => intrinsic('text', props);
const Label: JsxComponent<TextProps> = (props) => intrinsic('label', props);
const List: JsxComponent<ListProps> = (props) => intrinsic('list', props);
const Table: JsxComponent<TableProps> = (props) => intrinsic('table', props);
const Gauge: JsxComponent<GaugeProps> = (props) => intrinsic('gauge', props);
const LineGauge: JsxComponent<LineGaugeProps> = (props) => intrinsic('lineGauge', props);
const Tabs: JsxComponent<TabsProps> = (props) => intrinsic('tabs', props);
const Sparkline: JsxComponent<SparklineProps> = (props) => intrinsic('sparkline', props);
const BarChart: JsxComponent<BarChartProps> = (props) => intrinsic('barChart', props);
const Scrollbar: JsxComponent<ScrollbarProps> = (props) => intrinsic('scrollbar', props);
const Clear: JsxComponent<Record<string, never>> = (props) => intrinsic('clear', props);
const Cursor: JsxComponent<CursorProps> = (props) => intrinsic('cursor', props);

const isJsxElement = (value: unknown): value is JsxElement =>
	typeof value === 'object' && value !== null && 'type' in value && 'props' in value;

const flattenChildren = (value: JsxNode, out: JsxNode[]): void => {
	if (value === null || value === undefined || typeof value === 'boolean') {
		return;
	}
	if (Array.isArray(value)) {
		for (const child of value) {
			flattenChildren(child, out);
		}
		return;
	}
	out.push(value);
};

const normalizeChildren = (value: JsxNode | undefined): readonly JsxNode[] => {
	if (value === undefined) {
		return [];
	}
	const nodes: JsxNode[] = [];
	flattenChildren(value, nodes);
	return nodes;
};

const childrenFromProps = (props: JsxProps): readonly JsxNode[] =>
	normalizeChildren(props.children as JsxNode | undefined);

const resolveStyle = (
	base: Style | undefined,
	shorthands: StyleShorthands,
): Style | undefined => {
	let style = base ?? createStyle();
	let changed = base !== undefined;

	if (shorthands.fg !== undefined) {
		style = styleFg(style, shorthands.fg);
		changed = true;
	}
	if (shorthands.bg !== undefined) {
		style = styleBg(style, shorthands.bg);
		changed = true;
	}
	if (shorthands.bold) {
		style = styleAddModifier(style, Modifier.BOLD);
		changed = true;
	}

	return changed ? style : undefined;
};

const resolvePaddingShorthand = (p: number | undefined, px: number | undefined, py: number | undefined) => {
	if (p === undefined && px === undefined && py === undefined) {
		return undefined;
	}
	const vertical = py ?? p ?? 0;
	const horizontal = px ?? p ?? 0;
	return createPadding(vertical, horizontal, vertical, horizontal);
};

const resolveBlock = (
	block: BlockConfig | undefined,
	shorthands: BlockShorthands,
): BlockConfig | undefined => {
	const resolvedTitles = resolveTitles(shorthands.title);
	const resolvedPadding = resolvePaddingShorthand(shorthands.p, shorthands.px, shorthands.py);

	const needsBlock =
		block !== undefined ||
		shorthands.border !== undefined ||
		resolvedTitles !== undefined ||
		resolvedPadding !== undefined;

	if (!needsBlock) {
		return undefined;
	}

	const overrides: Partial<BlockConfig> = {
		...(block ?? {}),
		...(resolvedTitles !== undefined ? { titles: resolvedTitles } : {}),
		...(resolvedPadding !== undefined ? { padding: resolvedPadding } : {}),
	};

	if (shorthands.border === true) {
		return blockBordered(overrides);
	}
	if (shorthands.border === false) {
		return createBlock({ ...overrides, borders: Borders.NONE });
	}
	return createBlock(overrides);
};

const requiredProp = <T>(
	value: T | undefined,
	component: string,
	prop: string,
): T => {
	if (value !== undefined) {
		return value;
	}
	throw new Error(`<${component}> requires \`${prop}\` prop.`);
};

const renderChildren = (frame: Frame, children: readonly JsxNode[], area: Rect): void => {
	for (const child of children) {
		renderNode(frame, child, area);
	}
};

const renderPrimitive = (frame: Frame, value: string | number, area: Rect): void => {
	const paragraph = createParagraphWidget(String(value));
	frameRenderWidget(frame, renderParagraph(paragraph), area);
};

const resolveSpacing = (
	spacing: StackProps['spacing'],
	gap: StackProps['gap'],
): Spacing | undefined => {
	if (spacing === undefined) {
		if (gap === undefined) {
			return undefined;
		}
		return { type: 'space', value: gap };
	}
	if (typeof spacing === 'number') {
		return { type: 'space', value: spacing };
	}
	return spacing;
};

const renderStack = (
	frame: Frame,
	direction: 'horizontal' | 'vertical',
	props: StackProps,
	area: Rect,
): void => {
	const children = normalizeChildren(props.children);
	if (children.length === 0) {
		return;
	}

	const constraints: Constraint[] = [];
	for (let i = 0; i < children.length; i++) {
		constraints.push(props.constraints?.[i] ?? fillConstraint(1));
	}

	const layout = createLayout(constraints, {
		direction,
		margin: props.margin,
		spacing: resolveSpacing(props.spacing, props.gap),
	});

	const chunks = splitLayout(layout, area);
	const count = Math.min(chunks.length, children.length);

	for (let i = 0; i < count; i++) {
		const chunk = chunks[i];
		const child = children[i];
		if (chunk === undefined || child === undefined) {
			continue;
		}
		renderNode(frame, child, chunk);
	}
};

const toTitle = (value: string | Title): Title =>
	typeof value === 'string' ? createTitle(value) : value;

const resolveTitles = (title: BoxProps['title']): readonly Title[] | undefined => {
	if (title === undefined) {
		return undefined;
	}
	if (Array.isArray(title)) {
		return title.map(toTitle);
	}
	return [toTitle(title as string | Title)];
};

const renderBox = (frame: Frame, props: BoxProps, area: Rect): void => {
	const { bordered, border, title, p, px, py, fg, bg, bold, children, ...rest } = props;
	const resolvedTitles = rest.titles ?? resolveTitles(title);
	const resolvedPadding = rest.padding ?? resolvePaddingShorthand(p, px, py);
	const resolvedStyle = resolveStyle(rest.style, { fg, bg, bold });
	const blockOverrides: Partial<BlockConfig> = {
		...rest,
		...(resolvedTitles !== undefined ? { titles: resolvedTitles } : {}),
		...(resolvedPadding !== undefined ? { padding: resolvedPadding } : {}),
		...(resolvedStyle !== undefined ? { style: resolvedStyle } : {}),
	};

	const resolvedBorder = border ?? bordered;
	const block = resolvedBorder === true
		? blockBordered(blockOverrides)
		: resolvedBorder === false
		? createBlock({ ...blockOverrides, borders: Borders.NONE })
		: createBlock(blockOverrides);

	frameRenderWidget(frame, renderBlock(block), area);

	const inner = blockInner(block, area);
	if (inner.width === 0 || inner.height === 0) {
		return;
	}

	renderChildren(frame, normalizeChildren(children), inner);
};

const extractTextChildren = (children: readonly JsxNode[]): string => {
	let result = '';
	for (const child of children) {
		if (typeof child === 'string' || typeof child === 'number') {
			result += String(child);
		}
	}
	return result;
};

const renderText = (frame: Frame, props: TextProps, area: Rect): void => {
	const { text, align, fg, bg, bold, border, title, p, px, py, children, ...rest } = props;
	const resolvedText = text ?? extractTextChildren(normalizeChildren(children));
	const resolvedStyle = resolveStyle(rest.style, { fg, bg, bold });
	const resolvedBlock = resolveBlock(rest.block, { border, title, p, px, py });
	const paragraph = createParagraphWidget(resolvedText, {
		...rest,
		...(align !== undefined ? { alignment: align } : {}),
		...(resolvedStyle !== undefined ? { style: resolvedStyle } : {}),
		...(resolvedBlock !== undefined ? { block: resolvedBlock } : {}),
	});
	frameRenderWidget(frame, renderParagraph(paragraph), area);
};

const renderListNode = (frame: Frame, props: ListProps, area: Rect): void => {
	const { items, state, fg, bg, bold, border, title, p, px, py, ...rest } = props;
	const resolvedStyle = resolveStyle(rest.style, { fg, bg, bold });
	const resolvedBlock = resolveBlock(rest.block, { border, title, p, px, py });
	const list = createListWidget(requiredProp(items, 'List', 'items'), {
		...rest,
		...(resolvedStyle !== undefined ? { style: resolvedStyle } : {}),
		...(resolvedBlock !== undefined ? { block: resolvedBlock } : {}),
	});

	if (state !== undefined) {
		frameRenderStatefulWidget(frame, renderStatefulList(list), area, state);
		return;
	}

	frameRenderWidget(frame, renderList(list), area);
};

const isTableRow = (value: TableRowInput): value is TableRow =>
	typeof value === 'object' && value !== null && 'cells' in value;

const toTableRow = (value: TableRowInput): TableRow =>
	isTableRow(value) ? value : createTableRowWidget(value);

const renderTableNode = (frame: Frame, props: TableProps, area: Rect): void => {
	const { rows, widths, header, footer, state, fg, bg, bold, border, title, p, px, py, ...rest } = props;
	const tableRows = requiredProp(rows, 'Table', 'rows').map(toTableRow);
	const resolvedWidths = requiredProp(widths, 'Table', 'widths');
	const resolvedStyle = resolveStyle(rest.style, { fg, bg, bold });
	const resolvedBlock = resolveBlock(rest.block, { border, title, p, px, py });
	const table = createTableWidget(tableRows, resolvedWidths, {
		...rest,
		...(resolvedStyle !== undefined ? { style: resolvedStyle } : {}),
		...(resolvedBlock !== undefined ? { block: resolvedBlock } : {}),
		...(header !== undefined ? { header: toTableRow(header) } : {}),
		...(footer !== undefined ? { footer: toTableRow(footer) } : {}),
	});

	if (state !== undefined) {
		frameRenderStatefulWidget(frame, renderStatefulTable(table), area, state);
		return;
	}

	frameRenderWidget(frame, renderTable(table), area);
};

const renderGaugeNode = (frame: Frame, props: GaugeProps, area: Rect): void => {
	const { percent, fg, bg, bold, border, title, p, px, py, ...rest } = props;
	const resolvedStyle = resolveStyle(rest.style, { fg, bg, bold });
	const resolvedBlock = resolveBlock(rest.block, { border, title, p, px, py });
	const config = {
		...rest,
		...(resolvedStyle !== undefined ? { style: resolvedStyle } : {}),
		...(resolvedBlock !== undefined ? { block: resolvedBlock } : {}),
	};
	if (percent !== undefined) {
		const gauge = gaugePercent(percent, config);
		frameRenderWidget(frame, renderGauge(gauge), area);
		return;
	}

	const gauge = createGaugeWidget(config);
	frameRenderWidget(frame, renderGauge(gauge), area);
};

const renderLineGaugeNode = (frame: Frame, props: LineGaugeProps, area: Rect): void => {
	const { percent, fg, bg, bold, border, title, p, px, py, ...rest } = props;
	const resolvedStyle = resolveStyle(rest.style, { fg, bg, bold });
	const resolvedBlock = resolveBlock(rest.block, { border, title, p, px, py });
	const config = {
		...rest,
		...(resolvedStyle !== undefined ? { style: resolvedStyle } : {}),
		...(resolvedBlock !== undefined ? { block: resolvedBlock } : {}),
	};
	if (percent !== undefined) {
		const lineGauge = createLineGaugeWidget({ ...config, ratio: percent / 100 });
		frameRenderWidget(frame, renderLineGauge(lineGauge), area);
		return;
	}

	const lineGauge = createLineGaugeWidget(config);
	frameRenderWidget(frame, renderLineGauge(lineGauge), area);
};

const renderTabsNode = (frame: Frame, props: TabsProps, area: Rect): void => {
	const { titles, fg, bg, bold, border, title, p, px, py, ...rest } = props;
	const resolvedStyle = resolveStyle(rest.style, { fg, bg, bold });
	const resolvedBlock = resolveBlock(rest.block, { border, title, p, px, py });
	const tabs = createTabsWidget(requiredProp(titles, 'Tabs', 'titles'), {
		...rest,
		...(resolvedStyle !== undefined ? { style: resolvedStyle } : {}),
		...(resolvedBlock !== undefined ? { block: resolvedBlock } : {}),
	});
	frameRenderWidget(frame, renderTabs(tabs), area);
};

const renderSparklineNode = (frame: Frame, props: SparklineProps, area: Rect): void => {
	const { data, fg, bg, bold, border, title, p, px, py, ...rest } = props;
	const resolvedStyle = resolveStyle(rest.style, { fg, bg, bold });
	const resolvedBlock = resolveBlock(rest.block, { border, title, p, px, py });
	const sparkline = createSparklineWidget(requiredProp(data, 'Sparkline', 'data'), {
		...rest,
		...(resolvedStyle !== undefined ? { style: resolvedStyle } : {}),
		...(resolvedBlock !== undefined ? { block: resolvedBlock } : {}),
	});
	frameRenderWidget(frame, renderSparkline(sparkline), area);
};

const renderBarChartNode = (frame: Frame, props: BarChartProps, area: Rect): void => {
	const { data, fg, bg, bold, border, title, p, px, py, ...rest } = props;
	const resolvedStyle = resolveStyle(rest.style, { fg, bg, bold });
	const resolvedBlock = resolveBlock(rest.block, { border, title, p, px, py });
	const chart = createBarChartWidget(requiredProp(data, 'BarChart', 'data'), {
		...rest,
		...(resolvedStyle !== undefined ? { style: resolvedStyle } : {}),
		...(resolvedBlock !== undefined ? { block: resolvedBlock } : {}),
	});
	frameRenderWidget(frame, renderBarChart(chart), area);
};

const renderScrollbarNode = (frame: Frame, props: ScrollbarProps, area: Rect): void => {
	const { orientation, state, fg, bg, bold, ...rest } = props;
	const resolvedStyle = resolveStyle(rest.style, { fg, bg, bold });
	const scrollbar = createScrollbarWidget(requiredProp(orientation, 'Scrollbar', 'orientation'), {
		...rest,
		...(resolvedStyle !== undefined ? { style: resolvedStyle } : {}),
	});
	frameRenderStatefulWidget(
		frame,
		renderStatefulScrollbar(scrollbar),
		area,
		requiredProp(state, 'Scrollbar', 'state'),
	);
};

const renderCursorNode = (frame: Frame, props: CursorProps, area: Rect): void => {
	const x = requiredProp(props.x, 'Cursor', 'x');
	const y = requiredProp(props.y, 'Cursor', 'y');
	if (props.absolute) {
		frameSetCursorPosition(frame, createPosition(x, y));
		return;
	}
	frameSetCursorPosition(frame, createPosition(area.x + x, area.y + y));
};

const renderIntrinsic = (frame: Frame, type: string, props: JsxProps, area: Rect): void => {
	switch (type) {
		case 'vstack':
		case 'column':
			renderStack(frame, 'vertical', props as unknown as StackProps, area);
			return;
		case 'hstack':
		case 'row':
			renderStack(frame, 'horizontal', props as unknown as StackProps, area);
			return;
		case 'box':
			renderBox(frame, props as unknown as BoxProps, area);
			return;
		case 'panel': {
			const panelProps = props as unknown as BoxProps;
			renderBox(
				frame,
				{ ...panelProps, bordered: panelProps.bordered ?? panelProps.border ?? true },
				area,
			);
			return;
		}
		case 'text':
		case 'label':
			renderText(frame, props as unknown as TextProps, area);
			return;
		case 'list':
			renderListNode(frame, props as unknown as ListProps, area);
			return;
		case 'table':
			renderTableNode(frame, props as unknown as TableProps, area);
			return;
		case 'gauge':
			renderGaugeNode(frame, props as unknown as GaugeProps, area);
			return;
		case 'lineGauge':
			renderLineGaugeNode(frame, props as unknown as LineGaugeProps, area);
			return;
		case 'tabs':
			renderTabsNode(frame, props as unknown as TabsProps, area);
			return;
		case 'sparkline':
			renderSparklineNode(frame, props as unknown as SparklineProps, area);
			return;
		case 'barChart':
			renderBarChartNode(frame, props as unknown as BarChartProps, area);
			return;
		case 'scrollbar':
			renderScrollbarNode(frame, props as unknown as ScrollbarProps, area);
			return;
		case 'clear':
			frameRenderWidget(frame, renderClear(), area);
			return;
		case 'cursor':
			renderCursorNode(frame, props as unknown as CursorProps, area);
			return;
		default:
			renderChildren(frame, childrenFromProps(props), area);
	}
};

const renderNode = (frame: Frame, node: JsxNode, area: Rect): void => {
	if (node === null || node === undefined || typeof node === 'boolean') {
		return;
	}

	if (typeof node === 'string' || typeof node === 'number') {
		renderPrimitive(frame, node, area);
		return;
	}

	if (Array.isArray(node)) {
		renderChildren(frame, node, area);
		return;
	}

	if (!isJsxElement(node)) {
		return;
	}

	if (node.type === Fragment) {
		renderChildren(frame, childrenFromProps(node.props as JsxProps), area);
		return;
	}

	if (typeof node.type === 'function') {
		renderNode(frame, node.type(node.props), area);
		return;
	}

	if (typeof node.type === 'string') {
		renderIntrinsic(frame, node.type, node.props as JsxProps, area);
	}
};

const renderJsx = (frame: Frame, root: JsxNode, area: Rect = frame.area): void => {
	renderNode(frame, root, area);
};

const terminalDrawJsx = (
	terminal: Terminal,
	root: TerminalDrawJsxRoot,
	area?: Rect,
): CompletedFrame =>
	terminalDraw(terminal, (frame) => {
		const resolvedRoot = typeof root === 'function' ? root(frame) : root;
		renderJsx(frame, resolvedRoot, area ?? frame.area);
	});

const terminalLoopJsx = (
	terminal: Terminal,
	render: (frame: Frame, frameCount: number) => JsxNode,
	options?: TerminalLoopJsxOptions,
): TerminalLoopJsxResult => {
	const maxFrames = options?.maxFrames;
	const continueWhile = options?.continueWhile;

	if (maxFrames === undefined && continueWhile === undefined) {
		throw new Error('terminalLoopJsx requires either `maxFrames` or `continueWhile`.');
	}

	let frameCount = 0;
	let last: CompletedFrame | undefined;

	while (true) {
		if (maxFrames !== undefined && frameCount >= maxFrames) {
			break;
		}
		if (continueWhile !== undefined && !continueWhile(frameCount)) {
			break;
		}
		last = terminalDrawJsx(terminal, (frame) => render(frame, frameCount));
		frameCount++;
	}

	return {
		frames: frameCount,
		...(last !== undefined ? { last } : {}),
	};
};

const renderUI = renderJsx;

export type {
	StackProps,
	StyleShorthands,
	BlockShorthands,
	BoxProps,
	TextProps,
	ListProps,
	TableProps,
	GaugeProps,
	LineGaugeProps,
	TabsProps,
	SparklineProps,
	BarChartProps,
	ScrollbarProps,
	CursorProps,
	TerminalDrawJsxRoot,
	TerminalLoopJsxOptions,
	TerminalLoopJsxResult,
};

export {
	Fragment,
	renderJsx,
	renderUI,
	terminalDrawJsx,
	terminalLoopJsx,
	VStack,
	HStack,
	Column,
	Row,
	Box,
	Panel,
	Text,
	Label,
	List,
	Table,
	Gauge,
	LineGauge,
	Tabs,
	Sparkline,
	BarChart,
	Scrollbar,
	Clear,
	Cursor,
};
