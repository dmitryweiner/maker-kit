import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  // three is half a megabyte of the bundle: known, not news
  build: { chunkSizeWarningLimit: 700 },
  worker: { format: 'es' },
  // The kit is TypeScript sources: the dev server's dependency pre-bundling
  // reads them as JavaScript and dies. Vite serves them as the app's own.
  // manifold-3d finds its .wasm by a path relative to its glue, which
  // pre-bundling breaks (Case Constructor's, Cast Builder's configs).
  optimizeDeps: { exclude: ['maker-kit', 'manifold-3d'] },
  // The fixture has no install of its own: its manifold-3d is the kit's, out
  // of the dev server's root, and its .wasm is fetched as a file. An app's is
  // in its own node_modules.
  server: { fs: { allow: ['..'] } },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Node does not strip types of files in node_modules: vitest must
    // transform the kit's sources as the app's own (plans/PLAN.md).
    server: { deps: { inline: ['maker-kit'] } },
  },
});
