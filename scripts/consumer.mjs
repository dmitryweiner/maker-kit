// Installs the kit into consumer/ as an app gets it — packed by npm, so only
// the files in package.json's `files`, under consumer/node_modules — and runs
// the app's checks over it: tsc with an app's strictest tsconfig, vitest
// (with server.deps.inline), vite build, and the page on vite's dev server
// in Chromium (its dependency pre-bundling must leave the kit's sources
// alone). Proves that a source-only TypeScript package works from
// node_modules (plans/PLAN.md, "Consuming TypeScript sources from
// node_modules").
//
//   npm run consumer
//
// Prints each step; exits 1 on the first that fails. The consumer uses the
// kit's own typescript, vitest and vite (node resolution walks up), so it
// needs no install of its own.

import { execFileSync, spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { check, launch } from './harness.mjs';

const root = resolve(import.meta.dirname, '..');
const consumer = join(root, 'consumer');
const bin = (name) => join(root, 'node_modules', '.bin', name);

function run(cmd, args, cwd = consumer) {
  console.log(`> ${[cmd.replace(`${root}/`, ''), ...args].join(' ')}`);
  execFileSync(cmd, args, { cwd, stdio: 'inherit' });
}

/**
 * The consumer's page on a fresh dev server: the dependency optimizer scans
 * what the page imports, and a TypeScript source it took for JavaScript
 * crashed the server (Plate Builder's worker importing maker-kit/3d/mesh).
 */
async function devServer() {
  console.log('> vite (dev server) in Chromium');
  rmSync(join(consumer, 'node_modules', '.vite'), { recursive: true, force: true });
  const port = 5396;
  // the kit's vite (the consumer has no install of its own); launch finds it listening
  const server = spawn(bin('vite'), ['--port', String(port), '--strictPort'], { cwd: consumer, stdio: ['ignore', 'ignore', 'inherit'] });
  let exited = false;
  server.on('exit', () => {
    exited = true;
  });
  for (let i = 0; i < 40; i++) {
    if (
      await fetch(`http://localhost:${port}/`).then(
        (r) => r.ok,
        () => false,
      )
    )
      break;
    await new Promise((r) => setTimeout(r, 250));
  }
  const app = await launch({ ports: { dev: port, preview: 4396 } });
  try {
    const { page } = await app.open();
    await page.waitForFunction(() => document.getElementById('out')?.textContent !== '', null, { timeout: 15000 });
    // a module worker on maker-kit/csg: the WASM loaded through the kit, a threaded rod built
    await page.waitForFunction(() => document.getElementById('solid')?.textContent !== '', null, { timeout: 30000 });
    const solid = await page.locator('#solid').textContent();
    check(Number(solid) > 500 && Number(solid) < 790, `the csg worker answered ${solid}`);
    // the optimizer runs on after the page has loaded, and a reload follows it: the server must outlive both
    await page.waitForTimeout(3000);
    await page.reload({ waitUntil: 'load' });
    check(!exited, 'the dev server died while serving the page (its dependency pre-bundling, above)');
    check(app.errors.length === 0, `console errors:\n${app.errors.join('\n')}`);
  } finally {
    await app.close();
    server.kill();
  }
}

const packDir = mkdtempSync(join(tmpdir(), 'maker-kit-pack-'));
try {
  const [packed] = JSON.parse(execFileSync('npm', ['pack', '--json', '--pack-destination', packDir], { cwd: root, encoding: 'utf8' }));
  const target = join(consumer, 'node_modules', 'maker-kit');
  rmSync(target, { recursive: true, force: true });
  mkdirSync(target, { recursive: true });
  run('tar', ['-xzf', join(packDir, packed.filename), '-C', target, '--strip-components=1']);
  console.log(`  ${packed.entryCount} files packed`);
  run(bin('tsc'), ['--noEmit', '-p', '.']);
  run(bin('vitest'), ['run']);
  run(bin('vite'), ['build', '--logLevel', 'warn']);
  await devServer();
  console.log('ok  the kit works as an installed package');
} finally {
  rmSync(packDir, { recursive: true, force: true });
}
