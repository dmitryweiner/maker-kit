import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Node does not strip types of files in node_modules: vitest must
    // transform the kit's sources as the app's own (plans/PLAN.md).
    server: { deps: { inline: ['maker-kit'] } },
  },
});
