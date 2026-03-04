/**
 * Primary Screen Demo
 *
 * Renders a dashboard directly to the primary terminal screen (stdout).
 * This writes over whatever is currently displayed — no alternate screen switching.
 * Good for one-shot renders, simple status displays, or piped output.
 *
 * Run: npx tsx examples/primary-screen.ts
 */
import {
	createTestBackendState,
	createTestBackend,
	testBackendToString,
} from '../src/backends/test';
import { createBuffer, bufferSetStyle } from '../src/core/buffer';
import { createRect, createLayout, lengthConstraint, fillConstraint, splitLayout } from '../src/core/layout';
import { createStyle, styleFg, styleBg, Color, Modifier, styleAddModifier } from '../src/core/style';
import { rawText, createText, createLine, styledSpan, rawSpan } from '../src/core/text';
import {
	createTerminal,
	terminalDraw,
	frameRenderWidget,
	frameRenderStatefulWidget,
} from '../src/core/terminal';
import { blockBordered, createTitle, renderBlock } from '../src/widgets/block';
import { createParagraph, renderParagraph } from '../src/widgets/paragraph';
import { createList, createListState, renderStatefulList } from '../src/widgets/list';
import { createTable, createRow, renderTable } from '../src/widgets/table';
import { gaugePercent, renderGauge } from '../src/widgets/gauge';
import { createTabs, renderTabs } from '../src/widgets/tabs';
import { createSparkline, renderSparkline } from '../src/widgets/sparkline';
import type { Frame } from '../src/core/terminal';

const WIDTH = 80;
const HEIGHT = 24;

const renderDashboard = (frame: Frame): void => {
	const area = frame.area;

	// Main vertical layout: header(3) | body(fill) | footer(3)
	const mainLayout = createLayout([
		lengthConstraint(3),
		fillConstraint(1),
		lengthConstraint(3),
	]);
	const mainChunks = splitLayout(mainLayout, area);
	const headerArea = mainChunks[0]!;
	const bodyArea = mainChunks[1]!;
	const footerArea = mainChunks[2]!;

	// --- Header: Tabs ---
	const tabs = createTabs(['Dashboard', 'Logs', 'Settings'], {
		selected: 0,
		block: blockBordered({ titles: [createTitle('terminui')] }),
		highlightStyle: styleAddModifier(
			styleFg(createStyle(), Color.Yellow),
			Modifier.BOLD,
		),
	});
	frameRenderWidget(frame, renderTabs(tabs), headerArea);

	// --- Body: split into left(50%) and right(50%) ---
	const bodyLayout = createLayout(
		[fillConstraint(1), fillConstraint(1)],
		{ direction: 'horizontal' },
	);
	const bodyChunks = splitLayout(bodyLayout, bodyArea);
	const leftArea = bodyChunks[0]!;
	const rightArea = bodyChunks[1]!;

	// Left side: vertical split - List(fill) | Gauge(3)
	const leftLayout = createLayout([fillConstraint(1), lengthConstraint(3)]);
	const leftChunks = splitLayout(leftLayout, leftArea);
	const listArea = leftChunks[0]!;
	const gaugeArea = leftChunks[1]!;

	// List widget
	const list = createList(
		['Download files', 'Process data', 'Generate report', 'Upload results', 'Clean up'],
		{
			block: blockBordered({ titles: [createTitle('Tasks')] }),
			highlightStyle: styleBg(createStyle(), Color.DarkGray),
			highlightSymbol: '❯ ',
		},
	);
	const listState = createListState(1);
	frameRenderStatefulWidget(frame, renderStatefulList(list), listArea, listState);

	// Gauge widget
	const gauge = gaugePercent(67, {
		block: blockBordered({ titles: [createTitle('Progress')] }),
		useUnicode: true,
		gaugeStyle: styleFg(createStyle(), Color.Green),
	});
	frameRenderWidget(frame, renderGauge(gauge), gaugeArea);

	// Right side: vertical split - Table(fill) | Sparkline(5)
	const rightLayout = createLayout([fillConstraint(1), lengthConstraint(5)]);
	const rightChunks = splitLayout(rightLayout, rightArea);
	const tableArea = rightChunks[0]!;
	const sparkArea = rightChunks[1]!;

	// Table widget
	const table = createTable(
		[
			createRow(['api-server', '200ms', '✓ healthy']),
			createRow(['database', '45ms', '✓ healthy']),
			createRow(['cache', '12ms', '✓ healthy']),
			createRow(['worker', '890ms', '⚠ slow']),
		],
		[
			lengthConstraint(12),
			lengthConstraint(10),
			fillConstraint(1),
		],
		{
			header: createRow(['Service', 'Latency', 'Status'], {
				style: styleAddModifier(createStyle(), Modifier.BOLD),
			}),
			block: blockBordered({ titles: [createTitle('Services')] }),
		},
	);
	frameRenderWidget(frame, renderTable(table), tableArea);

	// Sparkline widget
	const sparkline = createSparkline(
		[0, 1, 2, 4, 6, 4, 3, 5, 8, 7, 6, 4, 2, 3, 5, 7, 9, 8, 6, 4, 3, 2, 1, 3, 5, 7, 9, 10, 8, 6, 5, 3, 2, 4, 6, 8, 7, 5, 3, 1],
		{
			block: blockBordered({ titles: [createTitle('Throughput')] }),
			style: styleFg(createStyle(), Color.Cyan),
		},
	);
	frameRenderWidget(frame, renderSparkline(sparkline), sparkArea);

	// --- Footer: Paragraph ---
	const footerText = createText([
		createLine([
			styledSpan('q', styleAddModifier(styleFg(createStyle(), Color.Red), Modifier.BOLD)),
			rawSpan(': quit  '),
			styledSpan('↑↓', styleAddModifier(styleFg(createStyle(), Color.Yellow), Modifier.BOLD)),
			rawSpan(': navigate  '),
			styledSpan('tab', styleAddModifier(styleFg(createStyle(), Color.Green), Modifier.BOLD)),
			rawSpan(': switch view'),
		]),
	]);
	const footer = createParagraph(footerText, {
		block: blockBordered(),
		alignment: 'center',
	});
	frameRenderWidget(frame, renderParagraph(footer), footerArea);
};

// Run: Render to a test backend and print to stdout
const state = createTestBackendState(WIDTH, HEIGHT);
const backend = createTestBackend(state);
const terminal = createTerminal(backend);

terminalDraw(terminal, renderDashboard);

console.log(testBackendToString(state));
console.log('\n--- Primary Screen Demo (terminui) ---');
console.log(`Rendered ${WIDTH}x${HEIGHT} dashboard using test backend`);
