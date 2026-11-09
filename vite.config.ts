import { defineConfig } from 'vite';

// The showcase: every component of the kit on one page, deployed to Pages.
export default defineConfig({
  root: 'showcase',
  // Relative base lets the build work both on GitHub Pages (/<repo>/) and from any static folder.
  base: './',
  build: { outDir: '../dist', emptyOutDir: true },
});
