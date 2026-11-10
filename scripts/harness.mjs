// The Playwright plumbing of a smoke script (`maker-kit/harness`): flag
// parsing, starting the project's vite server on its own ports, opening
// fresh pages that collect console errors, steps and the run around them,
// downloads, binary STL files, CPU throttling, waiting for CSS transitions.
// Plate Builder's and Cast Builder's harness with the ports as a parameter,
// plus Case Constructor's throttling, downloads and repeatable flags. An app
// keeps its own scripts/smoke.mjs and imports this (docs/harness.md).

import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

/** Phone and desktop viewports every layout check runs at. */
export const VIEWPORTS = {
  phone: { width: 390, height: 844 },
  desktop: { width: 1280, height: 860 },
};

/**
 * Parses `--flag value` / `--flag`; valueFlags lists the flags that take a
 * value, repeatableFlags those that take one each time and collect a list.
 */
export function parseArgs(argv, valueFlags = [], repeatableFlags = []) {
  const values = new Set(valueFlags);
  const repeatable = new Set(repeatableFlags);
  const flags = new Map();
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const name = arg.slice(2);
    if (repeatable.has(name)) flags.set(name, [...(flags.get(name) ?? []), argv[++i]]);
    else flags.set(name, values.has(name) ? argv[++i] : 'true');
  }
  return flags;
}

async function serverUp(base) {
  try {
    return (await fetch(base)).ok;
  } catch {
    return false;
  }
}

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { stdio: 'inherit' });
    proc.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(' ')} → ${code}`))));
  });
}

/**
 * Starts a dev / preview server on the project's port unless one already
 * listens there. Ports of the project's own, with --strictPort: another
 * project's server on Vite's default 5173 is never tested by mistake.
 */
export async function ensureServer({ preview, ports }) {
  const port = preview ? ports.preview : ports.dev;
  const base = `http://localhost:${port}/`;
  if (await serverUp(base)) return { base, proc: null };
  // vite preview serves the last build; without a rebuild the smoke would
  // test old code and fail somewhere puzzling
  if (preview) await run('npx', ['vite', 'build']);
  const proc = spawn('npx', ['vite', ...(preview ? ['preview'] : []), '--port', String(port), '--strictPort'], { stdio: 'ignore' });
  for (let i = 0; i < 40 && !(await serverUp(base)); i++) await new Promise((r) => setTimeout(r, 500));
  if (!(await serverUp(base))) {
    proc.kill();
    throw new Error(`server did not start on :${port}`);
  }
  return { base, proc };
}

/**
 * `step(name, fn)` labels the errors of a step and prints `ok  name (ms)`;
 * `run(body, done)` runs the steps, fails on the first failed one or on any
 * console error, prints `done` or `FAIL …`, closes the app and gives the
 * exit code. The output and the clock are parameters for tests.
 */
export function createSteps(app, out = console, now = Date.now) {
  async function step(name, fn) {
    app.label(name);
    const started = now();
    await fn();
    out.log(`ok  ${name} (${now() - started} ms)`);
  }

  async function runSteps(body, done = 'smoke passed') {
    let errorsChecked = false;
    try {
      await body();
      errorsChecked = true;
      check(app.errors.length === 0, `console errors:\n${app.errors.join('\n')}`);
      out.log(done);
      return 0;
    } catch (error) {
      out.error(`FAIL ${error instanceof Error ? error.message : String(error)}`);
      if (!errorsChecked && app.errors.length) out.error(app.errors.join('\n'));
      return 1;
    } finally {
      await app.close();
    }
  }

  return { step, run: runSteps };
}

/**
 * Starts the server and a browser. `open({ locale, viewport, storage, script })`
 * makes a fresh context (empty storage, the given browser language) and loads
 * the app. Console errors and page errors of every page land in `errors`,
 * tagged with the step set by `label(text)` or `step(name, fn)`.
 */
export async function launch({ preview = false, ports }) {
  const { base, proc } = await ensureServer({ preview, ports });
  // In a cloud container Playwright may miss its own chromium while another
  // is installed: PLAYWRIGHT_BROWSER gives its path.
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_BROWSER || undefined });
  const errors = [];
  let current = 'start';

  /**
   * `storage`: localStorage entries to start with (set only where nothing is
   * stored yet, so a reload keeps what the page saved); `script`: a function
   * run in every page before its own scripts; `path`: the page under the base.
   */
  async function open({ locale = 'en-US', viewport = VIEWPORTS.desktop, storage = null, script = null, path = '' } = {}) {
    const context = await browser.newContext({ locale, viewport, acceptDownloads: true });
    if (storage) {
      await context.addInitScript((entries) => {
        for (const [key, value] of Object.entries(entries)) if (localStorage.getItem(key) === null) localStorage.setItem(key, value);
      }, storage);
    }
    if (script) await context.addInitScript(script);
    const page = await context.newPage();
    page.on('pageerror', (e) => errors.push(`[${current}] ${String(e)}`));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(`[${current}] ${m.text()}`);
    });
    await page.goto(new URL(path, base).href, { waitUntil: 'load' });
    return { page, context };
  }

  const app = {
    base,
    errors,
    open,
    label: (text) => {
      current = text;
    },
    async close() {
      await browser.close();
      proc?.kill();
    },
  };
  const steps = createSteps(app);
  return {
    ...app,
    step: steps.step,
    async run(body, done) {
      process.exitCode = await steps.run(body, done);
    },
  };
}

/** Throws with a readable message unless the condition holds. */
export function check(condition, message) {
  if (!condition) throw new Error(message);
}

/** The page is no wider than its viewport: nothing makes a phone scroll sideways. */
export async function horizontalOverflow(page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

/**
 * Waits for the page's CSS transitions to end: on the dev server the styles
 * come after the first paint, so a closed sheet is still sliding away at
 * `load`; an opened one slides in after a click.
 */
export async function settled(page) {
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => a instanceof CSSTransition)
        .map((a) => a.finished),
    ),
  );
}

/**
 * Clicks `selector` and waits for the file it downloads: its suggested name,
 * its bytes and the path Playwright keeps it at until the context closes.
 */
export async function download(page, selector, { timeout = 60000 } = {}) {
  const [file] = await Promise.all([page.waitForEvent('download', { timeout }), page.click(selector)]);
  const path = await file.path();
  return { name: file.suggestedFilename(), bytes: await readFile(path), path };
}

/**
 * The header and triangle count of a binary STL, or null when its size is
 * not 84 + 50 bytes per triangle (a truncated or an ASCII file).
 */
export function binaryStl(bytes) {
  if (bytes.length < 84) return null;
  const triangles = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(80, true);
  if (bytes.length !== 84 + 50 * triangles) return null;
  const header = new TextDecoder().decode(bytes.subarray(0, 80)).replace(/[\0\s]+$/, '');
  return { header, triangles };
}

const cdpSessions = new WeakMap();

/**
 * Slows the page's CPU `rate` times (1 removes it). On a fast machine much
 * happens before it can be seen: the progress bar, for one.
 */
export async function throttle(page, rate) {
  let session = cdpSessions.get(page);
  if (!session) {
    session = await page.context().newCDPSession(page);
    cdpSessions.set(page, session);
  }
  await session.send('Emulation.setCPUThrottlingRate', { rate });
}

/**
 * The app works offline after a first visit: the visit warms the service
 * worker's cache (waits for `navigator.serviceWorker.ready`, then a reload
 * runs under it), the context goes offline, a reload must show the app —
 * `ready(page)` checks that it did. Gives the page back, offline, for the
 * app's further checks (its worker and WASM from the cache); the caller
 * closes the context. A build only: the dev server has no service worker.
 */
export async function offline(app, { ready, ...open }) {
  const { page, context } = await app.open(open);
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await ready(page);
  return { page, context };
}
