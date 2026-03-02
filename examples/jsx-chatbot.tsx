/**
 * Interactive JSX Chatbot Demo (Fake AI)
 *
 * Real TTY demo:
 * - Alternate screen buffer (no scrollback spam)
 * - Raw keyboard input
 * - Diff-based terminal drawing with batched ANSI writes (reduced flicker)
 *
 * Run: npx tsx examples/jsx-chatbot.tsx
 */
/** @jsxRuntime automatic */
/** @jsxImportSource ../src */
import readline from 'node:readline';
import { stdin as input, stdout as output } from 'node:process';
import { setTimeout as sleep } from 'node:timers/promises';

import type { Cell } from '../src/core/buffer';
import { charWidth } from '../src/core/buffer';
import { createSize } from '../src/core/layout';
import type { Position, Size } from '../src/core/layout';
import type { Backend } from '../src/core/terminal';
import { createTerminal, terminalResize } from '../src/core/terminal';
import type { Color as TerminalColor } from '../src/core/style';
import { Color, Modifier, indexedColor } from '../src/core/style';
import { Box, Column, Cursor, Label, Panel, Row, Text, terminalDrawJsx } from '../src/jsx';
import { fillConstraint, lengthConstraint } from '../src';

interface ChatMessage {
	readonly role: 'user' | 'assistant';
	content: string;
	readonly at: number;
}

interface AppState {
	messages: ChatMessage[];
	input: string;
	status: string;
	busy: boolean;
	startedAt: number;
	typingStep: number;
	scrollFromBottom: number;
	chatViewportLines: number;
}

const MAX_MESSAGES = 240;
const THEME = {
	accent: indexedColor(81),
	muted: indexedColor(244),
	success: indexedColor(84),
	user: indexedColor(111),
	assistant: indexedColor(222),
} as const;

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

const colorKey = (color: TerminalColor | undefined): string => {
	if (color === undefined) {
		return 'u';
	}
	if (color.type === 'indexed') {
		return `i:${color.index}`;
	}
	if (color.type === 'rgb') {
		return `r:${color.r}:${color.g}:${color.b}`;
	}
	return `n:${color.type}`;
};

const namedColorAnsi = (type: string, bg: boolean): string => {
	const fgMap: Record<string, number> = {
		black: 30,
		red: 31,
		green: 32,
		yellow: 33,
		blue: 34,
		magenta: 35,
		cyan: 36,
		gray: 37,
		'dark-gray': 90,
		'light-red': 91,
		'light-green': 92,
		'light-yellow': 93,
		'light-blue': 94,
		'light-magenta': 95,
		'light-cyan': 96,
		white: 97,
	};
	const bgMap: Record<string, number> = {
		black: 40,
		red: 41,
		green: 42,
		yellow: 43,
		blue: 44,
		magenta: 45,
		cyan: 46,
		gray: 47,
		'dark-gray': 100,
		'light-red': 101,
		'light-green': 102,
		'light-yellow': 103,
		'light-blue': 104,
		'light-magenta': 105,
		'light-cyan': 106,
		white: 107,
	};
	const code = (bg ? bgMap : fgMap)[type];
	return code === undefined ? (bg ? '49' : '39') : String(code);
};

const colorAnsi = (color: TerminalColor | undefined, bg: boolean): string => {
	if (color === undefined) {
		return bg ? '49' : '39';
	}
	if (color.type === 'reset') {
		return bg ? '49' : '39';
	}
	if (color.type === 'indexed') {
		return `${bg ? '48' : '38'};5;${color.index}`;
	}
	if (color.type === 'rgb') {
		return `${bg ? '48' : '38'};2;${color.r};${color.g};${color.b}`;
	}
	return namedColorAnsi(color.type, bg);
};

const modifierAnsi = (modifier: number): readonly string[] => {
	const codes: string[] = [];
	if (Modifier.contains(modifier, Modifier.BOLD)) codes.push('1');
	if (Modifier.contains(modifier, Modifier.DIM)) codes.push('2');
	if (Modifier.contains(modifier, Modifier.ITALIC)) codes.push('3');
	if (Modifier.contains(modifier, Modifier.UNDERLINED)) codes.push('4');
	if (Modifier.contains(modifier, Modifier.SLOW_BLINK)) codes.push('5');
	if (Modifier.contains(modifier, Modifier.RAPID_BLINK)) codes.push('6');
	if (Modifier.contains(modifier, Modifier.REVERSED)) codes.push('7');
	if (Modifier.contains(modifier, Modifier.HIDDEN)) codes.push('8');
	if (Modifier.contains(modifier, Modifier.CROSSED_OUT)) codes.push('9');
	if (Modifier.contains(modifier, Modifier.DOUBLE_UNDERLINED)) codes.push('21');
	if (Modifier.contains(modifier, Modifier.OVERLINED)) codes.push('53');
	return codes;
};

const moveTo = (x: number, y: number): string => `\u001B[${y + 1};${x + 1}H`;

const styleKey = (cell: Cell): string => `${colorKey(cell.fg)}|${colorKey(cell.bg)}|${cell.modifier}`;

const styleAnsi = (cell: Cell): string => {
	const codes = [
		colorAnsi(cell.fg, false),
		colorAnsi(cell.bg, true),
		...modifierAnsi(cell.modifier),
	];
	return `\u001B[0;${codes.join(';')}m`;
};

const symbolOutput = (cell: Cell): string => (cell.symbol === '' ? ' ' : cell.symbol);

const createAnsiBackend = (): Backend => {
	let pending = '';
	let style = '';
	let cursor: Position = { x: 0, y: 0 };

	const write = (chunk: string): void => {
		output.write(chunk);
	};

	const size = (): Size => ({
		width: Math.max(70, output.columns ?? 90),
		height: Math.max(18, (output.rows ?? 28) - 1),
	});

	return {
		size,
		draw: (content): void => {
			if (content.length === 0) {
				return;
			}

			const sorted = [...content].sort((a, b) => (a.y - b.y) || (a.x - b.x));
			for (const entry of sorted) {
				if (cursor.y !== entry.y || cursor.x !== entry.x) {
					pending += moveTo(entry.x, entry.y);
					cursor = { x: entry.x, y: entry.y };
				}

				const key = styleKey(entry.cell);
				if (key !== style) {
					pending += styleAnsi(entry.cell);
					style = key;
				}

				const symbol = symbolOutput(entry.cell);
				pending += symbol;
				cursor = {
					x: cursor.x + Math.max(1, charWidth(symbol.codePointAt(0) ?? 0)),
					y: cursor.y,
				};
			}
		},
		flush: (): void => {
			if (pending.length === 0) {
				return;
			}
			write(pending);
			pending = '';
		},
		hideCursor: (): void => {
			write('\u001B[?25l');
		},
		showCursor: (): void => {
			write('\u001B[?25h');
		},
		getCursorPosition: (): Position => cursor,
		setCursorPosition: (pos: Position): void => {
			cursor = pos;
			write(moveTo(pos.x, pos.y));
		},
		clear: (): void => {
			write('\u001B[2J\u001B[H');
			style = '';
			cursor = { x: 0, y: 0 };
		},
	};
};

const fakeAiResponse = (userInput: string, turn: number): string => {
	const text = userInput.trim();
	const lower = text.toLowerCase();

	if (lower.includes('hello') || lower.includes('hi')) {
		return 'Hello. I am running in mock mode, but the interaction model is real and event-driven.';
	}
	if (lower.includes('regex')) {
		return 'Try: ^[a-zA-Z0-9_-]{3,16}$ for a username. Share exact constraints and I can refine it.';
	}
	if (lower.includes('plan') || lower.includes('schedule')) {
		return 'Plan template: define top 3 outcomes, estimate effort, timebox focus blocks, and keep 20% buffer.';
	}
	if (lower.includes('typescript') || lower.includes('ts')) {
		return 'TypeScript practice: strict interfaces at boundaries, narrow unknowns early, avoid implicit any.';
	}
	if (lower.includes('performance')) {
		return 'Performance strategy: measure first, reduce redraw scope, batch updates, and avoid unnecessary allocations.';
	}
	if (lower.endsWith('?')) {
		return `Great question. Mock answer #${turn}: start with the smallest useful slice, validate it, then iterate.`;
	}

	const canned = [
		'This is a fake AI response, but the terminal UX loop here is close to a production interaction pattern.',
		'If wired to a real model, this panel would stream token chunks while preserving stable layout and cursor.',
		'Try prompting me with: "design a CLI command API" or "explain debounce vs throttle".',
	];
	return canned[turn % canned.length] ?? 'Mock response.';
};

const streamTokens = async (
	target: ChatMessage,
	reply: string,
	onToken: () => void,
): Promise<void> => {
	const parts = reply.split(/(\s+)/).filter((s) => s.length > 0);
	for (const part of parts) {
		target.content += part;
		onToken();
		await sleep(20 + Math.floor(Math.random() * 35));
	}
};

const normalizeInput = (value: string): string => value.replace(/\s+/g, ' ').trim();

const trimMessages = (messages: ChatMessage[]): void => {
	if (messages.length <= MAX_MESSAGES) {
		return;
	}
	messages.splice(0, messages.length - MAX_MESSAGES);
};

const formatTime = (at: number): string => {
	const date = new Date(at);
	const hh = String(date.getHours()).padStart(2, '0');
	const mm = String(date.getMinutes()).padStart(2, '0');
	const ss = String(date.getSeconds()).padStart(2, '0');
	return `${hh}:${mm}:${ss}`;
};

const indentLines = (text: string, prefix: string): string =>
	text
		.split('\n')
		.map((line) => `${prefix}${line}`)
		.join('\n');

const stringCellWidth = (text: string): number => {
	let width = 0;
	for (const ch of text) {
		width += Math.max(1, charWidth(ch.codePointAt(0) ?? 0));
	}
	return width;
};

const buildTranscript = (messages: readonly ChatMessage[]): string =>
	messages
		.map((m, i) => {
			const role = m.role === 'user' ? 'you' : 'assistant';
			return `${role} · ${String(i + 1).padStart(2, '0')} · ${formatTime(m.at)}\n${indentLines(m.content, '  ')}`;
		})
		.join('\n\n');

const uptimeText = (startedAt: number): string => {
	const sec = Math.floor((Date.now() - startedAt) / 1000);
	const mm = String(Math.floor(sec / 60)).padStart(2, '0');
	const ss = String(sec % 60).padStart(2, '0');
	return `${mm}:${ss}`;
};

const run = async (): Promise<void> => {
	if (!input.isTTY || !output.isTTY) {
		output.write('This demo requires an interactive TTY.\n');
		process.exitCode = 1;
		return;
	}

	const backend = createAnsiBackend();
	const terminal = createTerminal(backend);
	const app: AppState = {
		messages: [
			{
				role: 'assistant',
				content:
					'Welcome. This demo is fake-AI content with a real-time terminal UI loop. Type /exit to quit.',
				at: Date.now(),
			},
		],
		input: '',
		status: 'Idle',
		busy: false,
		startedAt: Date.now(),
		typingStep: 0,
		scrollFromBottom: 0,
		chatViewportLines: 1,
	};

	let shuttingDown = false;
	let renderTimer: NodeJS.Timeout | undefined;
	let heartbeatTimer: NodeJS.Timeout | undefined;

	const safeCleanup = (): void => {
		if (shuttingDown) {
			return;
		}
		shuttingDown = true;

		if (renderTimer !== undefined) {
			clearTimeout(renderTimer);
			renderTimer = undefined;
		}
		if (heartbeatTimer !== undefined) {
			clearInterval(heartbeatTimer);
			heartbeatTimer = undefined;
		}

		output.off('resize', onResize);
		input.off('keypress', onKeypress);

		try {
			input.setRawMode(false);
		} catch {
			// ignore
		}

		output.write('\u001B[0m\u001B[?25h');
		output.write('\u001B[?1049l');
		output.write('\u001B[2J\u001B[3J\u001B[H');
	};

	const renderNow = (): void => {
		if (shuttingDown) {
			return;
		}

		const frameArea = terminal.viewportArea;
		const sideWidth = Math.min(32, Math.max(24, Math.floor(frameArea.width * 0.28)));
		const bodyHeight = Math.max(1, frameArea.height - 11);
		const transcript = buildTranscript(app.messages);
		const chatInnerHeight = Math.max(1, bodyHeight - 2);
		app.chatViewportLines = chatInnerHeight;
		const totalLines = transcript.split('\n').length;
		const maxScrollFromBottom = Math.max(0, totalLines - chatInnerHeight);
		if (app.scrollFromBottom > maxScrollFromBottom) {
			app.scrollFromBottom = maxScrollFromBottom;
		}
		const scrollFromBottom = app.scrollFromBottom;
		const scrollY = Math.max(0, maxScrollFromBottom - scrollFromBottom);
		const prompt = '> ';

		terminalDrawJsx(terminal, (frame) => {
			const inputMax = Math.max(1, frame.area.width - 8 - prompt.length);
			const visibleInput = app.input.slice(-inputMax);
			const cursorX = clamp(prompt.length + stringCellWidth(visibleInput), 0, prompt.length + inputMax);
			const statusTone = app.busy ? Color.LightYellow : Color.LightGreen;
			const statusText = app.busy ? 'streaming' : 'ready';
			const modeText = app.busy
				? 'assistant typing...'
				: scrollFromBottom > 0
					? `scroll lock +${scrollFromBottom}`
					: 'normal mode';
			const sidebarText =
				'buffers\n' +
				'  chat/main         active\n' +
				'  notes/today       idle\n' +
				'  draft/review      idle\n\n' +
				'workspace\n' +
				'  terminui/examples\n\n' +
				'engine\n' +
				'  mock local stream';
			const hotkeysText =
				'keys\n' +
				'  Enter   send\n' +
				'  Esc     quit\n' +
				'  ↑/↓     scroll chat\n' +
				'  /clear  wipe chat';

			return (
					<Column constraints={[lengthConstraint(3), fillConstraint(1), lengthConstraint(7)]} gap={1}>
					<Panel title="terminui chat" p={1} fg={THEME.accent}>
						<Row constraints={[lengthConstraint(10), fillConstraint(1), lengthConstraint(24)]}>
							<Label text=" NORMAL " fg={THEME.success} bold />
							<Label text={modeText} align="center" fg={THEME.muted} />
							<Label text={`status ${statusText} · uptime ${uptimeText(app.startedAt)}`} align="right" fg={statusTone} />
						</Row>
					</Panel>

					<Row constraints={[lengthConstraint(sideWidth), fillConstraint(1)]} gap={1}>
						<Column constraints={[fillConstraint(1), lengthConstraint(7)]} gap={1}>
							<Panel title="workspace" p={1} fg={Color.LightCyan}>
								<Text text={sidebarText} wrap={{ trim: true }} />
							</Panel>
							<Panel title="help" p={1} fg={Color.LightBlue}>
								<Text text={hotkeysText} wrap={{ trim: true }} />
							</Panel>
						</Column>

						<Panel
							title={`conversation · ${app.messages.length} messages${scrollFromBottom > 0 ? ` · +${scrollFromBottom}` : ''}`}
							p={1}
							fg={THEME.accent}
						>
							<Text text={transcript} wrap={{ trim: true }} scroll={[scrollY, 0]} />
						</Panel>
					</Row>

					<Panel title="command" p={1} fg={THEME.accent}>
						<Column constraints={[lengthConstraint(1), fillConstraint(1)]}>
							<Row constraints={[fillConstraint(1), lengthConstraint(20)]}>
								<Label text="Enter send · ↑/↓ scroll · Esc quit" fg={THEME.muted} />
								<Label text={`status ${app.status}`} align="right" fg={statusTone} bold />
							</Row>
							<Box>
								<Text text={`${prompt}${visibleInput}`} fg={Color.White} />
								<Cursor x={cursorX} y={0} />
							</Box>
						</Column>
					</Panel>
				</Column>
			);
		});
	};

	const requestRender = (): void => {
		if (shuttingDown || renderTimer !== undefined) {
			return;
		}
		renderTimer = setTimeout(() => {
			renderTimer = undefined;
			renderNow();
		}, 16);
	};

	const onResize = (): void => {
		terminalResize(terminal, createSize(backend.size().width, backend.size().height));
		renderNow();
	};

	const maxScrollFromBottom = (): number => {
		const lines = buildTranscript(app.messages).split('\n').length;
		return Math.max(0, lines - Math.max(1, app.chatViewportLines));
	};

	const scrollConversation = (delta: number): void => {
		const next = clamp(app.scrollFromBottom + delta, 0, maxScrollFromBottom());
		if (next !== app.scrollFromBottom) {
			app.scrollFromBottom = next;
			requestRender();
		}
	};

	const submit = async (): Promise<void> => {
		const message = normalizeInput(app.input);
		app.input = '';

		if (message.length === 0) {
			requestRender();
			return;
		}

		if (message === '/exit' || message === 'exit' || message === 'quit') {
			safeCleanup();
			process.exit(0);
		}

		if (message === '/clear') {
			app.messages = [{
				role: 'assistant',
				content: 'History cleared. Continue chatting.',
				at: Date.now(),
			}];
			app.status = 'Idle';
			app.scrollFromBottom = 0;
			requestRender();
			return;
		}

		if (app.busy) {
			return;
		}

		app.scrollFromBottom = 0;
		app.messages.push({ role: 'user', content: message, at: Date.now() });
		trimMessages(app.messages);
		app.busy = true;
		app.status = 'Thinking...';
		requestRender();

		await sleep(120 + Math.min(600, message.length * 7));

		const reply: ChatMessage = { role: 'assistant', content: '', at: Date.now() };
		app.messages.push(reply);
		trimMessages(app.messages);
		app.status = 'Streaming...';
		requestRender();

		const full = fakeAiResponse(message, app.messages.length);
		app.typingStep++;
		const step = app.typingStep;
		await streamTokens(reply, full, () => {
			if (step !== app.typingStep || shuttingDown) {
				return;
			}
			requestRender();
		});

		app.busy = false;
		app.status = 'Idle';
		requestRender();
	};

	readline.emitKeypressEvents(input);
	input.setRawMode(true);
	input.resume();

	const onKeypress = (str: string | undefined, key: readline.Key | undefined): void => {
		if (shuttingDown) {
			return;
		}

		if (key?.ctrl && key.name === 'c') {
			safeCleanup();
			process.exit(0);
			return;
		}
		if (key?.name === 'up') {
			scrollConversation(1);
			return;
		}
		if (key?.name === 'down') {
			scrollConversation(-1);
			return;
		}

		if (key?.name === 'escape') {
			safeCleanup();
			process.exit(0);
			return;
		}

		if (key?.name === 'return' || key?.name === 'enter' || str === '\r' || str === '\n') {
			void submit();
			return;
		}

		if (key?.name === 'backspace' || str === '\u0008' || str === '\u007f') {
			if (!app.busy && app.input.length > 0) {
				app.input = app.input.slice(0, -1);
				requestRender();
			}
			return;
		}

		if (app.busy || key?.ctrl || key?.meta) {
			return;
		}

		let raw = str ?? key?.sequence ?? '';
		if (raw.length === 0) {
			if (key?.name === 'space') {
				raw = ' ';
			} else if (typeof key?.name === 'string' && key.name.length === 1) {
				raw = key.shift ? key.name.toUpperCase() : key.name;
			}
		}

		const printable = raw.replace(/[\u0000-\u001F\u007F]/g, '');
		if (printable.length === 0) {
			return;
		}

		let changed = false;
		for (const ch of printable) {
			const w = charWidth(ch.codePointAt(0) ?? 0);
			if (w > 0) {
				app.input += ch;
				changed = true;
			}
		}

		if (changed) {
			requestRender();
		}
	};

	output.write('\u001B[?1049h'); // alternate screen
	output.write('\u001B[2J\u001B[3J\u001B[H'); // clear screen + scrollback
	output.write('\u001B[?25l');

	input.on('keypress', onKeypress);
	output.on('resize', onResize);
	heartbeatTimer = setInterval(() => requestRender(), 1_000);
	onResize();

	process.on('exit', () => safeCleanup());
	process.on('SIGTERM', () => {
		safeCleanup();
		process.exit(0);
	});
	process.on('SIGINT', () => {
		safeCleanup();
		process.exit(0);
	});
};

void run();
