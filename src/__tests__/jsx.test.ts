import { describe, expect, it } from 'vitest';

import { createTestBackend, createTestBackendState, testBackendToString } from '../backends/test';
import { fillConstraint, lengthConstraint } from '../core/layout';
import { createTerminal, terminalDraw } from '../core/terminal';
import { Color, Modifier } from '../core/style';
import { jsx, jsxs } from '../jsx-runtime';
import {
	Box,
	Column,
	Cursor,
	Fragment,
	Gauge,
	HStack,
	Label,
	List,
	Panel,
	Row,
	Text,
	VStack,
	renderJsx,
	renderUI,
	terminalDrawJsx,
	terminalLoopJsx,
} from '../jsx';
import { createListState } from '../widgets/list';

const findCellBySymbol = (
	state: ReturnType<typeof createTestBackendState>,
	symbol: string,
) => {
	for (const row of state.buffer) {
		for (const cell of row) {
			if (cell.symbol === symbol) {
				return cell;
			}
		}
	}
	return undefined;
};

describe('jsx renderer', () => {
	it('renders nested layout and widgets', () => {
		const state = createTestBackendState(40, 10);
		const terminal = createTerminal(createTestBackend(state));
		const listState = createListState(1);

		terminalDraw(terminal, (frame) => {
			renderJsx(
				frame,
				jsxs(VStack, {
					constraints: [lengthConstraint(3), fillConstraint(1)],
					children: [
						jsx(Box, {
							bordered: true,
							title: 'Header',
							children: jsx(Text, { text: 'JSX UI' }),
						}),
						jsxs(HStack, {
							constraints: [fillConstraint(1), fillConstraint(1)],
							spacing: 1,
							children: [
								jsx(Box, {
									bordered: true,
									title: 'Menu',
									children: jsx(List, {
										items: ['Overview', 'Metrics', 'Logs'],
										state: listState,
										highlightSymbol: '> ',
									}),
								}),
								jsx(Box, {
									bordered: true,
									title: 'Load',
									children: jsx(Gauge, { percent: 42 }),
								}),
							],
						}),
					],
				}),
			);
		});

		const output = testBackendToString(state);
		expect(output).toContain('Header');
		expect(output).toContain('JSX UI');
		expect(output).toContain('Menu');
		expect(output).toContain('Load');
	});

	it('supports function components', () => {
		const state = createTestBackendState(24, 5);
		const terminal = createTerminal(createTestBackend(state));

		const Greeting = ({ name }: { readonly name: string }) =>
			jsx(Box, {
				bordered: true,
				title: 'Greeting',
				children: jsx(Text, { text: `Hi ${name}` }),
			});

		terminalDraw(terminal, (frame) => {
			renderUI(frame, jsx(Greeting, { name: 'Ada' }));
		});

		const output = testBackendToString(state);
		expect(output).toContain('Greeting');
		expect(output).toContain('Hi Ada');
	});

	it('supports fragment and cursor positioning', () => {
		const state = createTestBackendState(12, 4);
		const terminal = createTerminal(createTestBackend(state));

		terminalDraw(terminal, (frame) => {
			renderJsx(
				frame,
				jsxs(Fragment, {
					children: [
						jsx(Text, { text: 'cursor demo' }),
						jsx(Cursor, { x: 2, y: 1 }),
					],
				}),
			);
		});

		expect(state.cursorVisible).toBe(true);
		expect(state.cursorPosition).toEqual({ x: 2, y: 1 });
		expect(testBackendToString(state)).toContain('cursor demo');
	});

	it('supports React-like aliases and shorthand props', () => {
		const state = createTestBackendState(28, 8);
		const terminal = createTerminal(createTestBackend(state));

		terminalDraw(terminal, (frame) => {
			renderJsx(
				frame,
				jsxs(Column, {
					constraints: [lengthConstraint(5), fillConstraint(1)],
					gap: 1,
					children: [
						jsx(Panel, {
							title: 'Alias',
							p: 1,
							children: jsx(Label, { text: 'X', fg: Color.Red, bold: true, align: 'center' }),
						}),
						jsxs(Row, {
							gap: 1,
							children: [
								jsx(Box, { border: true, title: 'L', children: jsx(Text, { text: 'left' }) }),
								jsx(Box, { border: true, title: 'R', children: jsx(Text, { text: 'right' }) }),
							],
						}),
					],
				}),
			);
		});

		const output = testBackendToString(state);
		expect(output).toContain('Alias');
		expect(output).toContain('L');
		expect(output).toContain('R');
		expect(output).toContain('┌'); // Panel defaults to bordered

		const xCell = findCellBySymbol(state, 'X');
		expect(xCell?.fg).toEqual(Color.Red);
		expect(Modifier.contains(xCell?.modifier ?? 0, Modifier.BOLD)).toBe(true);
	});

	it('has terminalDrawJsx and terminalLoopJsx helpers', () => {
		const state = createTestBackendState(16, 3);
		const terminal = createTerminal(createTestBackend(state));

		const first = terminalDrawJsx(terminal, jsx(Text, { text: 'frame 0' }));
		expect(first.count).toBe(0);
		expect(testBackendToString(state)).toContain('frame 0');

		const loop = terminalLoopJsx(
			terminal,
			(_frame, frameCount) => jsx(Text, { text: `frame ${frameCount + 1}` }),
			{ maxFrames: 2 },
		);

		expect(loop.frames).toBe(2);
		expect(loop.last?.count).toBe(2);
		expect(testBackendToString(state)).toContain('frame 2');
	});

	it('throws clear runtime errors for missing required props', () => {
		const state = createTestBackendState(10, 3);
		const terminal = createTerminal(createTestBackend(state));

		expect(() =>
			terminalDraw(terminal, (frame) => {
				renderJsx(frame, jsx('list', {}));
			}),
		).toThrow('<List> requires `items` prop.');

		expect(() =>
			terminalLoopJsx(terminal, () => jsx(Text, { text: 'no loop options' })),
		).toThrow('terminalLoopJsx requires either `maxFrames` or `continueWhile`.');
	});
});
