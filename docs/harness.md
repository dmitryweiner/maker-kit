# harness — the Playwright plumbing of a smoke

`maker-kit/harness` (`scripts/harness.mjs`, types in `harness.d.mts`) is what
every app's `scripts/smoke.mjs` used to copy: flags, its vite server on its
own ports, fresh pages that collect console errors, steps and the run around
them. The app keeps its smoke and its scenario; `playwright` is its
dev dependency (an optional peer of the kit).

```js
import { binaryStl, check, download, launch, parseArgs, settled, VIEWPORTS } from 'maker-kit/harness';

const flags = parseArgs(process.argv.slice(2));
const preview = flags.has('preview');
const app = await launch({ preview, ports: { dev: 5373, preview: 4373 } });

await app.run(async () => {
  await app.step('downloads a real STL', async () => {
    const { page, context } = await app.open({ viewport: VIEWPORTS.phone, locale: 'he-IL' });
    const file = await download(page, '#downloadStl');
    const stl = binaryStl(file.bytes);
    check(file.name === 'plate.stl' && stl && stl.triangles > 0, `broken STL: ${file.bytes.length} bytes`);
    await context.close();
  });
}, `smoke passed (${preview ? 'preview' : 'dev'})`);
```

## The server and the browser

- `launch({ preview, ports })` starts `vite` (or `vite build` + `vite
  preview` with `--preview`: a preview of an old build tests old code) on the
  project's own port with `--strictPort`, unless one already listens there.
  Each project has its own pair: another project's server on 5173 is never
  tested by mistake. Taken: Case Constructor 5273/4273, cast-builder
  5291/4291, Plate Builder 5373/4373, the kit 5395/4395.
- `PLAYWRIGHT_BROWSER` gives a chromium's path where Playwright misses its own
  (a cloud container).
- `app.open({ locale, viewport, storage, script, path })` makes a fresh
  context: empty storage, the browser language `locale` (the app picks its
  language by it), downloads accepted. `storage` sets localStorage entries
  where nothing is stored yet, so a reload keeps what the page saved;
  `script` runs in every page before its own scripts; `path` is the page
  under the base (`?lang=he`). It returns `{ page, context }`; a step closes
  its context.

## Steps and the run

- `app.step(name, fn)` tags the console errors and page errors of its pages
  with the step's name and prints `ok  name (ms)`.
- `app.run(body, done)` runs the steps one after another and fails on the
  first failed step or on any console error at the end, printing `FAIL …`
  (with the errors seen so far: they often say why); otherwise it prints
  `done`. It always closes the browser and the server it started, and sets
  `process.exitCode`.
- `check(condition, message)` throws the message: the step fails with it.

## Helpers

- `VIEWPORTS.phone` (390 × 844) and `VIEWPORTS.desktop` (1280 × 860): every
  layout check runs at both.
- `horizontalOverflow(page)`: how many pixels the page scrolls sideways
  (0 on a good phone layout).
- `settled(page)`: waits for the CSS transitions to end, such as the sheet
  sliding in after a click, or away at `load` on the dev server.
- `download(page, selector, { timeout })`: clicks and waits for the file:
  `{ name, bytes, path }` (`path` lasts until the context closes). A long
  export passes a longer timeout than the 60 s default.
- `binaryStl(bytes)`: `{ header, triangles }` of a binary STL, or null when
  its size is not 84 + 50 bytes per triangle.
- `throttle(page, rate)`: slows the page's CPU `rate` times, 1 removes it.
  On a fast machine much happens before it can be seen: the progress bar,
  for one.
- `parseArgs(argv, valueFlags, repeatableFlags)`: `--flag` is `'true'`,
  `--name value` for a value flag, a list for a repeatable one
  (`--set a=1 --set b=2`).

## What stays in the app

Its scenario and the helpers that know its page: waiting for its build,
reading its status line, the offline check after its service worker (the
showcase has none, so the kit cannot test such a helper).
