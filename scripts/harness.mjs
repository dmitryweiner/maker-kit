// The Playwright plumbing of a smoke script (`maker-kit/harness`): flag
// parsing, starting the project's vite server on its own ports, opening
// fresh pages that collect console errors. An app keeps its own
// scripts/smoke.mjs and imports this. Plate Builder's and Cast Builder's
// harness with the ports as a parameter; K6 adds Case Constructor's CPU
// throttling and downloads.

import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

/** Phone and desktop viewports every layout check runs at. */
export const VIEWPORTS = {
  phone: { width: 390, height: 844 },
  desktop: { width: 1280, height: 860 },
};

/** Parses `--flag value` / `--flag`; valueFlags lists the flags that take a value. */
export function parseArgs(argv, valueFlags = []) {
  const values = new Set(valueFlags);
  const flags = new Map();
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const name = arg.slice(2);
    flags.set(name, values.has(name) ? argv[++i] : 'true');
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
 * Starts the server and a browser. `open({ locale, viewport, storage, script })`
 * makes a fresh context (empty storage, the given browser language) and loads
 * the app. Console errors and page errors of every page land in `errors`,
 * tagged with the step set by `label(text)`.
 */
export async function launch({ preview = false, ports }) {
  const { base, proc } = await ensureServer({ preview, ports });
  // In a cloud container Playwright may miss its own chromium while another
  // is installed: PLAYWRIGHT_BROWSER gives its path.
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_BROWSER || undefined });
  const errors = [];
  let step = 'start';

  /**
   * `storage`: localStorage entries to start with (set only where nothing is
   * stored yet, so a reload keeps what the page saved); `script`: a function
   * run in every page before its own scripts; `path`: the page under the base.
   */
  async function open({ locale = 'en-US', viewport = VIEWPORTS.desktop, storage = null, script = null, path = '' } = {}) {
    const context = await browser.newContext({ locale, viewport });
    if (storage) {
      await context.addInitScript((entries) => {
        for (const [key, value] of Object.entries(entries)) if (localStorage.getItem(key) === null) localStorage.setItem(key, value);
      }, storage);
    }
    if (script) await context.addInitScript(script);
    const page = await context.newPage();
    page.on('pageerror', (e) => errors.push(`[${step}] ${String(e)}`));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(`[${step}] ${m.text()}`);
    });
    await page.goto(new URL(path, base).href, { waitUntil: 'load' });
    return { page, context };
  }

  return {
    base,
    errors,
    open,
    label: (text) => {
      step = text;
    },
    async close() {
      await browser.close();
      proc?.kill();
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
