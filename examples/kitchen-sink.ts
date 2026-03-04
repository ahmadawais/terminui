/**
 * Kitchen Sink Demo
 *
 * Comprehensive example that touches every built-in widget and major capability:
 * - Widgets: Clear, Block, Paragraph, List, Table, Gauge, LineGauge, Tabs, Sparkline, BarChart, Scrollbar
 * - Stateful widgets: List, Table, Scrollbar
 * - Layout constraints: Length, Percentage, Ratio, Min, Max, Fill + overlap spacing
 * - Styles: named/indexed/rgb colors, modifiers, style add/subtract
 * - Text: wrapping, alignment, scrolling, wide characters
 * - Terminal APIs: clear, resize, cursor controls, multi-frame diff rendering
 *
 * Run:
 *   npx tsx examples/kitchen-sink.ts
 */
import * as tui from '../src/index';
import type { BorderType, Frame, Rect, ScrollbarOrientation } from '../src/index';

const WIDTH = 120;
const HEIGHT = 40;
const FRAMES = 5;

const BORDER_TYPES: readonly BorderType[] = [
	'plain',
	'rounded',
	'double',
	'thick',
	'quadrantInside',
	'quadrantOutside',
];

const SCROLLBAR_ORIENTATIONS: readonly ScrollbarOrientation[] = [
	'verticalRight',
	'verticalLeft',
	'horizontalBottom',
	'horizontalTop',
];

const baseSeries = (length: number, phase: number, amplitude: number): number[] => {
	const points: number[] = [];
	for (let i = 0; i < length; i++) {
		const wave = Math.sin((i + phase) / 3) + Math.cos((i + phase) / 7);
		const normalized = (wave + 2) / 4;
		points.push(Math.round(normalized * amplitude));
	}
	return points;
};

const renderHeaderTabs = (frame: Frame, area: Rect, tick: number): void => {
	if (area.width === 0 || area.height === 0) {
		return;
	}

	const baseTabStyle = tui.styleSubModifier(
		tui.styleAddModifier(
			tui.styleBg(tui.styleFg(tui.createStyle(), tui.Color.Black), tui.indexedColor(223)),
			tui.Modifier.BOLD | tui.Modifier.ITALIC,
		),
		tui.Modifier.ITALIC,
	);

	const tabs = tui.createTabs(['Overview', 'Widgets', 'State', 'Layout', 'Styles', 'Terminal'], {
		selected: tick % 6,
		style: baseTabStyle,
		highlightStyle: tui.styleAddModifier(
			tui.styleFg(tui.styleBg(tui.createStyle(), tui.rgbColor(0, 87, 173)), tui.Color.White),
			tui.Modifier.BOLD | tui.Modifier.UNDERLINED,
		),
		divider: tui.createSpan(' ⟫ '),
		paddingLeft: tui.createSpan('['),
		paddingRight: tui.createSpan(']'),
		block: tui.blockBordered({
			borderType: 'double',
			borderStyle: tui.styleFg(tui.createStyle(), tui.Color.LightBlue),
			titles: [
				tui.createTitle('terminui kitchen sink', { alignment: 'center' }),
				tui.createTitle(`frame ${tick + 1}/${FRAMES}`, {
					alignment: 'right',
					position: 'bottom',
				}),
			],
		}),
	});

	tui.frameRenderWidget(frame, tui.renderTabs(tabs), area);
};

const renderBorderGallery = (frame: Frame, area: Rect): void => {
	if (area.width === 0 || area.height === 0) {
		return;
	}

	const shell = tui.blockBordered({
		borderType: 'double',
		borderStyle: tui.styleFg(tui.createStyle(), tui.Color.LightBlue),
		padding: tui.createPadding(1, 1, 1, 1),
		titles: [
			tui.createTitle('Block border gallery', { alignment: 'center' }),
			tui.createTitle('top + bottom titles + custom padding', {
				position: 'bottom',
				alignment: 'right',
			}),
		],
	});

	tui.frameRenderWidget(frame, tui.renderBlock(shell), area);
	const inner = tui.blockInner(shell, area);
	if (inner.width === 0 || inner.height === 0) {
		return;
	}

	const chunks = tui.splitLayout(
		tui.createLayout(
			BORDER_TYPES.map(() => tui.fillConstraint(1)),
			{ direction: 'horizontal', spacing: { type: 'space', value: 1 } },
		),
		inner,
	);

	for (let i = 0; i < chunks.length; i++) {
		const chunk = chunks[i];
		const borderType = BORDER_TYPES[i];
		if (chunk === undefined || borderType === undefined) {
			continue;
		}

		const sample = tui.blockBordered({
			borderType,
			borderStyle: tui.styleFg(tui.createStyle(), tui.indexedColor(33 + i * 25)),
			titles: [tui.createTitle(borderType, { alignment: 'center' })],
		});

		tui.frameRenderWidget(frame, tui.renderBlock(sample), chunk);
	}
};

const renderListShowcase = (frame: Frame, area: Rect, tick: number): void => {
	if (area.width === 0 || area.height === 0) {
		return;
	}

	const chunks = tui.splitLayout(
		tui.createLayout([tui.ratioConstraint(2, 3), tui.fillConstraint(1)], {
			spacing: { type: 'space', value: 1 },
		}),
		area,
	);
	const statefulArea = chunks[0];
	const staticArea = chunks[1];
	if (statefulArea === undefined || staticArea === undefined) {
		return;
	}

	const queueItems = [
		tui.createListItem(
			tui.createText([
				tui.createLine([
					tui.styledSpan('Build artifacts', tui.styleFg(tui.createStyle(), tui.Color.LightCyan)),
				]),
				tui.createLine([tui.rawSpan(' + publish changelog')]),
			]),
		),
		tui.createListItem('Run tests'),
		tui.createListItem('Ship release'),
		tui.createListItem('Notify team'),
		tui.createListItem('Backup: 東京/大阪'),
		tui.createListItem('Post metrics'),
		tui.createListItem('Rotate keys'),
	];

	const selected = tick % queueItems.length;
	const listState = tui.createListState(selected);
	listState.offset = Math.max(0, selected - 2);

	const statefulList = tui.createList(queueItems, {
		block: tui.blockBordered({
			titles: [tui.createTitle('Stateful list', { alignment: 'center' })],
			borderType: 'rounded',
		}),
		style: tui.styleFg(tui.createStyle(), tui.Color.Gray),
		highlightStyle: tui.styleBg(
			tui.styleFg(tui.createStyle(), tui.Color.Black),
			tui.Color.LightGreen,
		),
		highlightSymbol: '❯ ',
		repeatHighlightSymbol: true,
		highlightSpacing: 'always',
	});

	tui.frameRenderStatefulWidget(
		frame,
		tui.renderStatefulList(statefulList),
		statefulArea,
		listState,
	);

	const reverseList = tui.createList(
		['oldest event', 'cache warm', 'deploy v2', 'incident resolved', 'report sent'],
		{
			direction: 'bottomToTop',
			highlightSpacing: 'never',
			style: tui.styleFg(tui.createStyle(), tui.Color.LightBlue),
			block: tui.blockBordered({
				titles: [tui.createTitle('Stateless reverse list', { alignment: 'center' })],
				borderType: 'thick',
			}),
		},
	);

	tui.frameRenderWidget(frame, tui.renderList(reverseList), staticArea);
};

const renderScrollbarShowcase = (frame: Frame, area: Rect, tick: number): void => {
	if (area.width === 0 || area.height === 0) {
		return;
	}

	const shell = tui.blockBordered({
		borderType: 'thick',
		titles: [tui.createTitle('Scrollbars (all 4 orientations)', { alignment: 'center' })],
	});

	tui.frameRenderWidget(frame, tui.renderBlock(shell), area);
	const inner = tui.blockInner(shell, area);
	if (inner.width === 0 || inner.height === 0) {
		return;
	}

	const rows = tui.splitLayout(
		tui.createLayout([tui.fillConstraint(1), tui.fillConstraint(1)], {
			spacing: { type: 'space', value: 1 },
		}),
		inner,
	);

	let panelIndex = 0;
	for (const row of rows) {
		const cols = tui.splitLayout(
			tui.createLayout([tui.fillConstraint(1), tui.fillConstraint(1)], {
				direction: 'horizontal',
				spacing: { type: 'space', value: 1 },
			}),
			row,
		);

		for (const cell of cols) {
			const orientation = SCROLLBAR_ORIENTATIONS[panelIndex];
			if (orientation === undefined) {
				continue;
			}

			const panel = tui.blockBordered({
				titles: [tui.createTitle(orientation, { alignment: 'center' })],
			});
			tui.frameRenderWidget(frame, tui.renderBlock(panel), cell);

			const panelInner = tui.blockInner(panel, cell);
			if (panelInner.width > 0 && panelInner.height > 0) {
				const preview = tui.createParagraph(
					tui.createText([
						tui.createLine([tui.rawSpan(`pos ${(tick * 11 + panelIndex * 17) % 120}`)]),
					]),
					{ alignment: 'center' },
				);
				tui.frameRenderWidget(frame, tui.renderParagraph(preview), panelInner);
			}

			const vertical = orientation === 'verticalRight' || orientation === 'verticalLeft';
			const symbolSet = vertical
				? panelIndex % 2 === 0
					? tui.scrollbar.VERTICAL
					: tui.scrollbar.DOUBLE_VERTICAL
				: panelIndex % 2 === 0
					? tui.scrollbar.HORIZONTAL
					: tui.scrollbar.DOUBLE_HORIZONTAL;

			const scrollbar = tui.createScrollbar(orientation, {
				symbolSet,
				style: tui.styleFg(tui.createStyle(), tui.Color.DarkGray),
				trackStyle: tui.styleFg(tui.createStyle(), tui.Color.Gray),
				thumbStyle: tui.styleFg(tui.createStyle(), tui.Color.LightMagenta),
			});

			const sbState = tui.createScrollbarState(120, (tick * 13 + panelIndex * 17) % 120);
			sbState.viewportContentLength = vertical
				? Math.max(1, cell.height - 2)
				: Math.max(1, cell.width - 2);

			tui.frameRenderStatefulWidget(frame, tui.renderStatefulScrollbar(scrollbar), cell, sbState);
			panelIndex++;
		}
	}
};

const renderParagraphPanel = (frame: Frame, area: Rect, tick: number): void => {
	if (area.width === 0 || area.height === 0) {
		return;
	}

	const emphasized = tui.styleSubModifier(
		tui.styleAddModifier(
			tui.styleFg(tui.createStyle(), tui.rgbColor(255, 145, 51)),
			tui.Modifier.BOLD | tui.Modifier.ITALIC | tui.Modifier.UNDERLINED,
		),
		tui.Modifier.ITALIC,
	);

	const text = tui.createText([
		tui.createLine(
			[
				tui.styledSpan(
					'Wide chars: 你好 世界 こんにちは',
					tui.styleFg(tui.createStyle(), tui.Color.LightCyan),
				),
			],
			{ alignment: 'center' },
		),
		tui.createLine([tui.rawSpan('Named + indexed + rgb colors can all be mixed per span.')]),
		tui.createLine([
			tui.styledSpan('indexed(213) ', tui.styleFg(tui.createStyle(), tui.indexedColor(213))),
			tui.styledSpan(
				'rgb(90, 200, 255)',
				tui.styleFg(tui.createStyle(), tui.rgbColor(90, 200, 255)),
			),
		]),
		tui.createLine([
			tui.styledSpan(
				'Modifiers: bold + underlined (italic removed via styleSubModifier)',
				emphasized,
			),
		]),
		tui.createLine([
			tui.rawSpan('This panel wraps and scrolls to exercise clipping and alignment across frames.'),
		]),
	]);

	const paragraph = tui.createParagraph(text, {
		block: tui.blockBordered({
			borderType: 'rounded',
			borderStyle: tui.styleFg(tui.createStyle(), tui.Color.Cyan),
			padding: tui.uniformPadding(1),
			titles: [
				tui.createTitle('Paragraph + Text + Styles', { alignment: 'center' }),
				tui.createTitle('wrap + scroll + alignment', { position: 'bottom', alignment: 'right' }),
			],
		}),
		wrap: { trim: true },
		scroll: [tick % 2, tick % 6],
		alignment: 'left',
		style: tui.styleBg(tui.createStyle(), tui.indexedColor(17)),
	});

	tui.frameRenderWidget(frame, tui.renderParagraph(paragraph), area);
};

const renderTableShowcase = (frame: Frame, area: Rect, tick: number): void => {
	if (area.width === 0 || area.height === 0) {
		return;
	}

	const chunks = tui.splitLayout(
		tui.createLayout([tui.fillConstraint(1), tui.lengthConstraint(2)], {
			spacing: { type: 'space', value: 1 },
		}),
		area,
	);
	const statefulArea = chunks[0];
	const staticArea = chunks[1];
	if (statefulArea === undefined || staticArea === undefined) {
		return;
	}

	const rows = [
		tui.createRow([
			tui.createTableCell('api-gateway', tui.styleFg(tui.createStyle(), tui.Color.Cyan)),
			'42ms',
			'stable',
		]),
		tui.createRow(
			[
				tui.createTableCell('postgres', tui.styleFg(tui.createStyle(), tui.Color.LightBlue)),
				'19ms',
				'healthy',
			],
			{ bottomMargin: 1 },
		),
		tui.createRow([
			tui.createTableCell('cache', tui.styleFg(tui.createStyle(), tui.Color.LightCyan)),
			'7ms',
			'healthy',
		]),
		tui.createRow([
			tui.createTableCell('worker', tui.styleFg(tui.createStyle(), tui.Color.LightYellow)),
			'188ms',
			'degraded',
		]),
		tui.createRow([
			tui.createTableCell('replica 東京', tui.styleFg(tui.createStyle(), tui.Color.LightMagenta)),
			'63ms',
			'healthy',
		]),
	];

	const statefulTable = tui.createTable(
		rows,
		[tui.lengthConstraint(14), tui.maxConstraint(8), tui.fillConstraint(1)],
		{
			columnSpacing: 2,
			block: tui.blockBordered({
				titles: [tui.createTitle('Stateful table', { alignment: 'center' })],
			}),
			header: tui.createRow(['service', 'latency', 'status'], {
				style: tui.styleAddModifier(
					tui.styleFg(tui.createStyle(), tui.Color.White),
					tui.Modifier.BOLD,
				),
			}),
			footer: tui.createRow(
				[`rows=${rows.length}`, `sel=${tick % rows.length}`, 'renderStatefulTable'],
				{
					style: tui.styleFg(tui.createStyle(), tui.Color.DarkGray),
				},
			),
			style: tui.styleFg(tui.createStyle(), tui.Color.Gray),
			highlightStyle: tui.styleBg(
				tui.styleFg(tui.createStyle(), tui.Color.Black),
				tui.Color.LightYellow,
			),
			highlightSymbol: '▸',
			highlightSpacing: 'always',
		},
	);

	const tableState = tui.createTableState(tick % rows.length);
	tableState.offset = Math.max(0, (tick % rows.length) - 2);
	tui.frameRenderStatefulWidget(
		frame,
		tui.renderStatefulTable(statefulTable),
		statefulArea,
		tableState,
	);

	const staticTable = tui.createTable(
		[tui.createRow(['renderTable()', 'stateless path'])],
		[tui.lengthConstraint(14), tui.fillConstraint(1)],
		{
			columnSpacing: 2,
			header: tui.createRow(['api', 'purpose'], {
				style: tui.styleAddModifier(tui.createStyle(), tui.Modifier.BOLD),
			}),
			style: tui.styleFg(tui.createStyle(), tui.Color.LightGreen),
		},
	);
	tui.frameRenderWidget(frame, tui.renderTable(staticTable), staticArea);
};

const renderGaugeShowcase = (frame: Frame, area: Rect, tick: number): void => {
	if (area.width === 0 || area.height === 0) {
		return;
	}

	const chunks = tui.splitLayout(
		tui.createLayout([tui.lengthConstraint(2), tui.lengthConstraint(2), tui.fillConstraint(1)], {
			spacing: { type: 'space', value: 1 },
		}),
		area,
	);
	const top = chunks[0];
	const middle = chunks[1];
	const bottom = chunks[2];
	if (top === undefined || middle === undefined || bottom === undefined) {
		return;
	}

	const uploadPct = (tick * 19) % 101;
	const asciiPct = (tick * 31) % 101;
	const memPct = (tick * 23) % 101;

	const unicodeGauge = tui.createGauge({
		ratio: uploadPct / 100,
		useUnicode: true,
		label: tui.createSpan(
			`${uploadPct}%`,
			tui.styleAddModifier(tui.createStyle(), tui.Modifier.BOLD),
		),
		block: tui.blockBordered({ titles: [tui.createTitle('createGauge() unicode')] }),
		style: tui.styleFg(tui.createStyle(), tui.Color.DarkGray),
		gaugeStyle: tui.styleFg(tui.createStyle(), tui.Color.LightGreen),
	});
	tui.frameRenderWidget(frame, tui.renderGauge(unicodeGauge), top);

	const asciiGauge = tui.gaugePercent(asciiPct, {
		useUnicode: false,
		label: tui.createSpan(`${asciiPct}%`, tui.styleFg(tui.createStyle(), tui.Color.Black)),
		block: tui.blockBordered({ titles: [tui.createTitle('gaugePercent() ascii')] }),
		style: tui.styleFg(tui.createStyle(), tui.Color.Gray),
		gaugeStyle: tui.styleBg(tui.styleFg(tui.createStyle(), tui.Color.White), tui.Color.Blue),
	});
	tui.frameRenderWidget(frame, tui.renderGauge(asciiGauge), middle);

	const lineGauge = tui.createLineGauge({
		ratio: memPct / 100,
		lineSet: tui.line.DOUBLE,
		label: tui.createSpan('mem ', tui.styleAddModifier(tui.createStyle(), tui.Modifier.BOLD)),
		block: tui.blockBordered({ titles: [tui.createTitle('createLineGauge()')] }),
		style: tui.styleFg(tui.createStyle(), tui.Color.DarkGray),
		gaugeStyle: tui.styleFg(tui.createStyle(), tui.Color.Magenta),
	});
	tui.frameRenderWidget(frame, tui.renderLineGauge(lineGauge), bottom);
};

const renderCoreApiPanel = (frame: Frame, area: Rect): void => {
	if (area.width === 0 || area.height === 0) {
		return;
	}

	const panel = tui.createBlock({
		borders: tui.Borders.ALL,
		borderType: 'quadrantInside',
		borderStyle: tui.styleFg(tui.createStyle(), tui.Color.LightBlue),
		padding: tui.createPadding(0, 1, 0, 1),
		titles: [tui.createTitle('Core APIs in this file', { alignment: 'center' })],
	});

	tui.frameRenderWidget(frame, tui.renderBlock(panel), area);
	const inner = tui.blockInner(panel, area);
	if (inner.width === 0 || inner.height === 0) {
		return;
	}

	const badgeArea = tui.createRect(
		inner.x,
		inner.y,
		Math.min(inner.width, 40),
		Math.min(inner.height, 1),
	);
	const badge = tui.createParagraph('terminalClear • terminalResize • cursor APIs', {
		style: tui.styleFg(tui.createStyle(), tui.Color.LightYellow),
		alignment: 'left',
	});
	tui.frameRenderWidget(frame, tui.renderParagraph(badge), badgeArea);

	if (inner.height > 1) {
		const bodyArea = tui.createRect(inner.x, inner.y + 1, inner.width, inner.height - 1);
		const description = tui.createParagraph(
			'Also uses renderClear + multi-frame terminalDraw to exercise diff-based rendering.',
			{
				wrap: { trim: true },
				style: tui.styleFg(tui.createStyle(), tui.Color.Gray),
			},
		);
		tui.frameRenderWidget(frame, tui.renderParagraph(description), bodyArea);
	}
};

const renderSparklinePanel = (frame: Frame, area: Rect, tick: number): void => {
	if (area.width === 0 || area.height === 0) {
		return;
	}

	const shell = tui.blockBordered({
		borderType: 'double',
		titles: [tui.createTitle('Sparkline (ltr + rtl)', { alignment: 'center' })],
	});
	tui.frameRenderWidget(frame, tui.renderBlock(shell), area);

	const inner = tui.blockInner(shell, area);
	if (inner.width === 0 || inner.height === 0) {
		return;
	}

	const chunks = tui.splitLayout(
		tui.createLayout([tui.fillConstraint(1), tui.fillConstraint(1)], {
			spacing: { type: 'space', value: 1 },
		}),
		inner,
	);
	const top = chunks[0];
	const bottom = chunks[1];
	if (top === undefined || bottom === undefined) {
		return;
	}

	const ltr = tui.createSparkline(baseSeries(64, tick * 2, 12), {
		style: tui.styleFg(tui.createStyle(), tui.Color.Cyan),
		barSet: tui.bar.NINE_LEVELS,
		direction: 'leftToRight',
	});
	tui.frameRenderWidget(frame, tui.renderSparkline(ltr), top);

	const rtl = tui.createSparkline(baseSeries(64, tick * 3 + 5, 12), {
		style: tui.styleFg(tui.createStyle(), tui.rgbColor(255, 173, 51)),
		barSet: tui.bar.ASCII,
		direction: 'rightToLeft',
	});
	tui.frameRenderWidget(frame, tui.renderSparkline(rtl), bottom);
};

const renderVerticalBarChart = (frame: Frame, area: Rect, tick: number): void => {
	if (area.width === 0 || area.height === 0) {
		return;
	}

	const north = tui.createBarGroup(
		[
			tui.createBar(18 + ((tick * 5) % 25), { label: tui.rawLine('Mon') }),
			tui.createBar(22 + ((tick * 3) % 25), { label: tui.rawLine('Tue') }),
			tui.createBar(13 + ((tick * 7) % 25), { label: tui.rawLine('Wed') }),
		],
		'north',
	);
	const south = tui.createBarGroup(
		[
			tui.createBar(30 + ((tick * 2) % 30), { label: tui.rawLine('Thu') }),
			tui.createBar(11 + ((tick * 9) % 20), { label: tui.rawLine('Fri') }),
			tui.createBar(26 + ((tick * 4) % 22), { label: tui.rawLine('Sat') }),
		],
		'south',
	);

	const chart = tui.createBarChart([north, south], {
		direction: 'vertical',
		block: tui.blockBordered({
			titles: [tui.createTitle('BarChart vertical', { alignment: 'center' })],
			borderType: 'rounded',
		}),
		barWidth: 2,
		barGap: 1,
		groupGap: 2,
		barStyle: tui.styleFg(tui.createStyle(), tui.Color.LightCyan),
		valueStyle: tui.styleFg(tui.createStyle(), tui.Color.White),
		labelStyle: tui.styleFg(tui.createStyle(), tui.Color.Gray),
		max: 60,
	});

	tui.frameRenderWidget(frame, tui.renderBarChart(chart), area);
};

const renderHorizontalBarChart = (frame: Frame, area: Rect, tick: number): void => {
	if (area.width === 0 || area.height === 0) {
		return;
	}

	const scoreGroup = tui.createBarGroup(
		[
			tui.createBar(54 + ((tick * 7) % 35), { label: tui.rawLine('CPU'), textValue: 'cpu' }),
			tui.createBar(33 + ((tick * 11) % 50), { label: tui.rawLine('MEM'), textValue: 'mem' }),
			tui.createBar(22 + ((tick * 13) % 60), { label: tui.rawLine('NET'), textValue: 'net' }),
			tui.createBar(17 + ((tick * 3) % 70), { label: tui.rawLine('IO'), textValue: 'io' }),
		],
		'scores',
	);

	const chart = tui.createBarChart([scoreGroup], {
		direction: 'horizontal',
		block: tui.blockBordered({
			titles: [tui.createTitle('BarChart horizontal', { alignment: 'center' })],
			borderType: 'plain',
		}),
		barWidth: 1,
		barGap: 1,
		groupGap: 1,
		barStyle: tui.styleFg(tui.createStyle(), tui.rgbColor(115, 245, 173)),
		valueStyle: tui.styleFg(tui.createStyle(), tui.Color.LightYellow),
		labelStyle: tui.styleFg(tui.createStyle(), tui.Color.Gray),
		max: 100,
	});

	tui.frameRenderWidget(frame, tui.renderBarChart(chart), area);
};

const renderStatus = (frame: Frame, area: Rect, tick: number): void => {
	if (area.width === 0 || area.height === 0) {
		return;
	}

	const sections = tui.splitLayout(
		tui.createLayout([tui.lengthConstraint(1), tui.lengthConstraint(3), tui.fillConstraint(1)]),
		area,
	);
	const summaryArea = sections[0];
	const constraintArea = sections[1];
	const overlapArea = sections[2];
	if (summaryArea === undefined || constraintArea === undefined || overlapArea === undefined) {
		return;
	}

	const summary = tui.createParagraph(
		tui.createText([
			tui.createLine([
				tui.styledSpan(
					'kitchen sink',
					tui.styleAddModifier(tui.styleFg(tui.createStyle(), tui.Color.Green), tui.Modifier.BOLD),
				),
				tui.rawSpan('  •  '),
				tui.styledSpan(
					`tick ${tick + 1}/${FRAMES}`,
					tui.styleFg(tui.createStyle(), tui.Color.LightYellow),
				),
				tui.rawSpan('  •  widgets + state + layout + style + cursor'),
			]),
		]),
		{ alignment: 'center' },
	);
	tui.frameRenderWidget(frame, tui.renderParagraph(summary), summaryArea);

	const constraintChunks = tui.splitLayout(
		tui.createLayout(
			[
				tui.lengthConstraint(10),
				tui.percentageConstraint(18),
				tui.ratioConstraint(1, 6),
				tui.minConstraint(8),
				tui.maxConstraint(10),
				tui.fillConstraint(1),
			],
			{
				direction: 'horizontal',
				margin: tui.createMargin(0, 1),
				spacing: { type: 'space', value: 1 },
			},
		),
		constraintArea,
	);

	const labels = ['Length', 'Percent', 'Ratio', 'Min', 'Max', 'Fill'];
	for (let i = 0; i < constraintChunks.length; i++) {
		const chunk = constraintChunks[i];
		const label = labels[i];
		if (chunk === undefined || label === undefined) {
			continue;
		}

		const constraintPanel = tui.createParagraph(`${label} ${chunk.width}w`, {
			alignment: 'center',
			block: tui.blockBordered({
				borderType: 'quadrantOutside',
				titles: [tui.createTitle(label, { alignment: 'center' })],
				borderStyle: tui.styleFg(tui.createStyle(), tui.indexedColor(124 + i * 18)),
			}),
			style: tui.styleFg(tui.createStyle(), tui.Color.White),
		});
		tui.frameRenderWidget(frame, tui.renderParagraph(constraintPanel), chunk);
	}

	const overlapChunks = tui.splitLayout(
		tui.createLayout([tui.lengthConstraint(22), tui.lengthConstraint(22), tui.fillConstraint(1)], {
			direction: 'horizontal',
			margin: tui.createMargin(0, 1),
			spacing: { type: 'overlap', value: 2 },
		}),
		overlapArea,
	);

	const overlapPanels = [
		tui.createBlock({
			borders: tui.Borders.TOP | tui.Borders.BOTTOM | tui.Borders.LEFT | tui.Borders.RIGHT,
			borderType: 'double',
			borderStyle: tui.styleFg(tui.createStyle(), tui.Color.LightRed),
			titles: [tui.createTitle('Overlap A', { alignment: 'center' })],
		}),
		tui.createBlock({
			borders: tui.Borders.TOP | tui.Borders.BOTTOM | tui.Borders.RIGHT,
			borderType: 'thick',
			borderStyle: tui.styleFg(tui.createStyle(), tui.Color.LightBlue),
			titles: [tui.createTitle('Overlap B', { alignment: 'center' })],
		}),
		tui.createBlock({
			borders: tui.Borders.TOP | tui.Borders.BOTTOM | tui.Borders.LEFT,
			borderType: 'rounded',
			borderStyle: tui.styleFg(tui.createStyle(), tui.Color.LightGreen),
			titles: [tui.createTitle('Overlap C', { alignment: 'center' })],
		}),
	];

	for (let i = 0; i < overlapChunks.length; i++) {
		const chunk = overlapChunks[i];
		const panel = overlapPanels[i];
		if (chunk === undefined || panel === undefined) {
			continue;
		}

		tui.frameRenderWidget(frame, tui.renderBlock(panel), chunk);
		const inner = tui.blockInner(panel, chunk);
		if (inner.width > 0 && inner.height > 0) {
			const caption = tui.createParagraph(
				tui.createText([tui.createLine([tui.rawSpan(`z=${i + 1}`)], { alignment: 'center' })]),
				{
					style: tui.styleAddModifier(
						tui.styleFg(tui.createStyle(), tui.Color.White),
						tui.Modifier.BOLD,
					),
					alignment: 'center',
				},
			);
			tui.frameRenderWidget(frame, tui.renderParagraph(caption), inner);
		}
	}
};

const renderKitchenSinkFrame = (frame: Frame, tick: number): void => {
	const area = frame.area;
	tui.frameRenderWidget(frame, tui.renderClear(), area);

	const outer = tui.splitLayout(
		tui.createLayout([tui.lengthConstraint(3), tui.fillConstraint(1), tui.lengthConstraint(7)]),
		area,
	);
	const headerArea = outer[0];
	const bodyArea = outer[1];
	const statusArea = outer[2];
	if (headerArea === undefined || bodyArea === undefined || statusArea === undefined) {
		return;
	}

	renderHeaderTabs(frame, headerArea, tick);

	const columns = tui.splitLayout(
		tui.createLayout([tui.minConstraint(32), tui.percentageConstraint(38), tui.fillConstraint(1)], {
			direction: 'horizontal',
			margin: tui.createMargin(0, 1),
			spacing: { type: 'space', value: 1 },
		}),
		bodyArea,
	);
	const left = columns[0];
	const middle = columns[1];
	const right = columns[2];
	if (left === undefined || middle === undefined || right === undefined) {
		return;
	}

	const leftSections = tui.splitLayout(
		tui.createLayout([tui.lengthConstraint(9), tui.ratioConstraint(2, 3), tui.fillConstraint(1)], {
			spacing: { type: 'space', value: 1 },
		}),
		left,
	);
	const leftTop = leftSections[0];
	const leftMid = leftSections[1];
	const leftBottom = leftSections[2];
	if (leftTop !== undefined) renderBorderGallery(frame, leftTop);
	if (leftMid !== undefined) renderListShowcase(frame, leftMid, tick);
	if (leftBottom !== undefined) renderScrollbarShowcase(frame, leftBottom, tick);

	const middleSections = tui.splitLayout(
		tui.createLayout(
			[
				tui.lengthConstraint(9),
				tui.lengthConstraint(9),
				tui.lengthConstraint(7),
				tui.fillConstraint(1),
			],
			{ spacing: { type: 'space', value: 1 } },
		),
		middle,
	);
	const middleTop = middleSections[0];
	const middleMid = middleSections[1];
	const middleLow = middleSections[2];
	const middleBottom = middleSections[3];
	if (middleTop !== undefined) renderParagraphPanel(frame, middleTop, tick);
	if (middleMid !== undefined) renderTableShowcase(frame, middleMid, tick);
	if (middleLow !== undefined) renderGaugeShowcase(frame, middleLow, tick);
	if (middleBottom !== undefined) renderCoreApiPanel(frame, middleBottom);

	const rightSections = tui.splitLayout(
		tui.createLayout([tui.maxConstraint(8), tui.lengthConstraint(10), tui.fillConstraint(1)], {
			spacing: { type: 'space', value: 1 },
		}),
		right,
	);
	const rightTop = rightSections[0];
	const rightMid = rightSections[1];
	const rightBottom = rightSections[2];
	if (rightTop !== undefined) renderSparklinePanel(frame, rightTop, tick);
	if (rightMid !== undefined) renderVerticalBarChart(frame, rightMid, tick);
	if (rightBottom !== undefined) renderHorizontalBarChart(frame, rightBottom, tick);

	renderStatus(frame, statusArea, tick);

	const cursorX = Math.min(area.width - 1, Math.max(0, 2 + tick));
	const cursorY = Math.min(area.height - 1, Math.max(0, area.height - 1));
	tui.frameSetCursorPosition(frame, tui.createPosition(cursorX, cursorY));
};

const state = tui.createTestBackendState(WIDTH, HEIGHT);
const backend = tui.createTestBackend(state);
const terminal = tui.createTerminal(backend);

tui.terminalResize(terminal, tui.createSize(WIDTH, HEIGHT));
tui.terminalClear(terminal);
tui.terminalHideCursor(terminal);
tui.terminalSetCursorPosition(terminal, tui.createPosition(0, 0));

for (let tick = 0; tick < FRAMES; tick++) {
	tui.terminalDraw(terminal, (frame) => {
		renderKitchenSinkFrame(frame, tick);
	});
}

tui.terminalShowCursor(terminal);

console.log(tui.testBackendToString(state));
console.log('');
console.log('--- Kitchen Sink Demo (terminui) ---');
console.log(`Rendered ${WIDTH}x${HEIGHT} in ${terminal.frameCount} frames`);
console.log(`Cursor visible: ${state.cursorVisible}`);
console.log(`Cursor position: (${state.cursorPosition.x}, ${state.cursorPosition.y})`);
console.log(
	'Covers: clear, block, paragraph, list, table, gauge, tabs, sparkline, barchart, scrollbar',
);
