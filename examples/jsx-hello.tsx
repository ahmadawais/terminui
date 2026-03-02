/**
 * JSX Hello Starter
 *
 * Minimal copy-paste starting point for terminui JSX.
 *
 * Run: npx tsx examples/jsx-hello.tsx
 */
/** @jsxRuntime automatic */
/** @jsxImportSource ../src */
import { createTestBackend, createTestBackendState, testBackendToString } from '../src/backends/test';
import { createTerminal } from '../src/core/terminal';
import { Color } from '../src/core/style';
import { Label, Panel, terminalDrawJsx } from '../src/jsx';

const state = createTestBackendState(40, 6);
const terminal = createTerminal(createTestBackend(state));

terminalDrawJsx(
	terminal,
	<Panel title="Hello JSX" p={1}>
		<Label text="terminal UI, React-like syntax" fg={Color.Cyan} bold align="center" />
	</Panel>,
);

console.log(testBackendToString(state));
