/**
 * JSX Dashboard Demo
 *
 * Shows the React-like JSX API for composing terminal UIs.
 *
 * Run: npx tsx examples/jsx-dashboard.tsx
 */
/** @jsxRuntime automatic */
/** @jsxImportSource ../src */
import { createTestBackend, createTestBackendState, testBackendToString } from '../src/backends/test';
import { fillConstraint, lengthConstraint } from '../src/core/layout';
import { createTerminal } from '../src/core/terminal';
import { Color } from '../src/core/style';
import {
	Column,
	Gauge,
	Label,
	List,
	Panel,
	Row,
	terminalDrawJsx,
} from '../src/jsx';
import { createListState } from '../src/widgets/list';

const WIDTH = 80;
const HEIGHT = 18;

const state = createTestBackendState(WIDTH, HEIGHT);
const backend = createTestBackend(state);
const terminal = createTerminal(backend);

const listState = createListState(1);

terminalDrawJsx(
	terminal,
	<Column constraints={[lengthConstraint(3), fillConstraint(1), lengthConstraint(3)]}>
		<Panel title="terminui JSX" p={1}>
			<Label
				text="React-like JSX syntax on top of the same fast diff renderer."
				align="center"
				fg={Color.LightCyan}
				bold
			/>
		</Panel>

		<Row constraints={[fillConstraint(1), fillConstraint(1)]} gap={1}>
			<Panel title="Tasks">
				<List
					items={['Fetch data', 'Render widgets', 'Flush diff', 'Await input']}
					state={listState}
					highlightSymbol="▶ "
				/>
			</Panel>
			<Panel title="Progress">
				<Gauge percent={72} />
			</Panel>
		</Row>

		<Panel p={1}>
			<Label text="Run this file with tsx to see the rendered frame output." align="center" />
		</Panel>
	</Column>,
);

console.log(testBackendToString(state));
console.log('\n--- JSX Dashboard Demo (terminui) ---');
