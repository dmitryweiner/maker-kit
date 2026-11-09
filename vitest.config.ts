import { defineConfig } from 'vitest/config';

// Apart from vite.config.ts, whose root is the showcase.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
  },
});
