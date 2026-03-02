import { defineConfig } from 'tsup';

export default defineConfig({
	entry: ['src/index.ts', 'src/jsx.ts', 'src/jsx-runtime.ts'],
	format: ['esm'],
	dts: true,
	splitting: false,
	sourcemap: true,
	clean: true,
	treeshake: true,
});
