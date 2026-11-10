import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import { serviceWorkerPlugin } from './showcase/sw-plugin';

// The showcase: every component of the kit on one page, deployed to Pages.
export default defineConfig({
  root: 'showcase',
  // Relative base lets the build work both on GitHub Pages (/<repo>/) and from any static folder.
  base: './',
  build: { outDir: '../dist', emptyOutDir: true },
  // the showcase's job worker is a module worker, as an app's CSG worker is
  worker: { format: 'es' },
  // offline after a first visit, as an app on the kit: the harness's `offline` checks it.
  // The id prefixes the cache: every app on <user>.github.io shares one origin.
  plugins: [serviceWorkerPlugin({ appId: 'maker-kit', publicDir: resolve(import.meta.dirname, 'showcase/public') })],
});
