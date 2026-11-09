// Installs the kit into consumer/ as an app gets it — packed by npm, so only
// the files in package.json's `files`, under consumer/node_modules — and runs
// the app's checks over it: tsc with an app's strictest tsconfig, vitest
// (with server.deps.inline), vite build. Proves that a source-only TypeScript
// package works from node_modules (plans/PLAN.md, "Consuming TypeScript
// sources from node_modules").
//
//   npm run consumer
//
// Prints each step; exits 1 on the first that fails. The consumer uses the
// kit's own typescript, vitest and vite (node resolution walks up), so it
// needs no install of its own.

import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const consumer = join(root, 'consumer');
const bin = (name) => join(root, 'node_modules', '.bin', name);

function run(cmd, args, cwd = consumer) {
  console.log(`> ${[cmd.replace(`${root}/`, ''), ...args].join(' ')}`);
  execFileSync(cmd, args, { cwd, stdio: 'inherit' });
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
  console.log('ok  the kit works as an installed package');
} finally {
  rmSync(packDir, { recursive: true, force: true });
}
