import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  // three is half a megabyte of the bundle: known, not news
  build: { chunkSizeWarningLimit: 700 },
  worker: { format: 'es' },
  // The kit is TypeScript sources: the dev server's dependency pre-bundling
  // reads them as JavaScript and dies. Vite serves them as the app's own.
  optimizeDeps: { exclude: ['maker-kit'] },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Node does not strip types of files in node_modules: vitest must
    // transform the kit's sources as the app's own (plans/PLAN.md).
    server: { deps: { inline: ['maker-kit'] } },
  },
});
