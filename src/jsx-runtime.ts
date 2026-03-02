type JsxKey = string | number;

type JsxProps = Record<string, unknown>;

type JsxComponent<P = unknown> = (props: P) => JsxElement | null;

type JsxType = string | symbol | JsxComponent<unknown>;

interface JsxElement {
	readonly type: JsxType;
	readonly props: unknown;
	readonly key: JsxKey | null;
}

type JsxNode =
	| JsxElement
	| string
	| number
	| boolean
	| null
	| undefined
	| readonly JsxNode[];

const Fragment = Symbol.for('terminui.fragment');

const createJsxElement = <P>(
	type: JsxType,
	props: P | null | undefined,
	key?: JsxKey,
): JsxElement => ({
	type,
	props: (props ?? {}) as unknown,
	key: key ?? null,
});

const jsx = <P>(
	type: JsxType | JsxComponent<P>,
	props: P | null,
	key?: JsxKey,
): JsxElement => createJsxElement(type as JsxType, props, key);

const jsxs = jsx;

const jsxDEV = <P>(
	type: JsxType | JsxComponent<P>,
	props: P | null,
	key?: JsxKey,
	_isStaticChildren?: boolean,
	_source?: unknown,
	_self?: unknown,
): JsxElement => createJsxElement(type as JsxType, props, key);

export namespace JSX {
	export type Element = JsxElement;

	export interface ElementChildrenAttribute {
		children: unknown;
	}

	export interface IntrinsicAttributes {
		key?: JsxKey;
	}

	export interface IntrinsicElements {
		[elemName: string]: unknown;
	}
}

export type { JsxKey, JsxProps, JsxType, JsxElement, JsxComponent, JsxNode };
export { Fragment, jsx, jsxs, jsxDEV };
