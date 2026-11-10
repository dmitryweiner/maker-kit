# Agents guide

maker-kit — the shared library of the 3D-printing tools in `~/projects`
(Case Constructor, Plate Builder, Cast Builder): controls, undo, storage,
presets, the mobile sheet, the progress bar, the worker queue, STL, the 3D
view, booleans on manifold and the printed thread, the smoke harness and
the design code. A source-only TypeScript
package (no build step), installed by git tag:
`"maker-kit": "github:dmitryweiner/maker-kit#v0.3.1"`. The showcase:
<https://dmitryweiner.github.io/maker-kit/>.

The shared conventions are in `~/projects/CLAUDE.md` and
`~/projects/_conventions/`; this file is what holds for this repository.
The plan, its decisions and deviations: `plans/PLAN.md`.

## Commands

Node.js — the version in `.node-version` (`fnm use`; check `node -v`).

- `npm ci` — install dependencies.
- `npm run dev` — the showcase on a dev server.
- `npm run check` — typecheck + oxlint + prettier + unit tests. Must pass
  before any work is called done.
- `npm run consumer` — packs the kit, installs it into `consumer/` and runs an
  app's tsc, vitest and vite build over it, and its page on vite's dev
  server in Chromium (port 5396), a module worker on `csg` building a
  threaded rod there.
- `npm run smoke` — browser smoke of the showcase (dev server, port 5395);
  `-- --preview` builds and checks the build (port 4395); `-- --shots` saves
  screenshots to `shots/`.
- `npm run build` — typecheck and build the showcase into `dist/`.
- `npm run format` — prettier.

CI (`.github/workflows/ci.yml`) runs `check`, `consumer` and the preview
smoke on every push and PR; a push to `main` publishes the showcase to
GitHub Pages.

## Releases

A release is a git tag `v<major>.<minor>.<patch>` on `main`, with the
version in `package.json` bumped in the same commit. Apps depend on the tag.
For joint work on an app and the kit: `npm link ../maker-kit` in the app.

## Plans

- `plans/PLAN.md` — the whole plan: decisions, module APIs, milestones
  K0–K7, M1–M3, C1, their status; deviations at its end (where an API
  differs from the plan's sketch, the deviation and `docs/` are right).

## Architectural invariants

- Layers: `core` and `i18n` import nothing else of the kit; `ui` imports
  `core` and `i18n`; `3d` and `worker` import `core` and `i18n`; `csg`
  imports `core`, `i18n` and `3d` but its viewer; nothing in the kit imports
  `ui` (the showcase does) or `csg`. Only `3d` imports `three`, only `csg`
  `manifold-3d` (and only `csg/manifold` at run time: `csg/thread`'s
  section loads without WASM); no source imports `node:*`. `.oxlintrc.json` enforces it with
  `no-restricted-imports` per folder.
- `core` has no DOM: functions that touch the page (download, file picker)
  live in `ui`.
- Sources are TypeScript, imported extensionless; they must pass the
  strictest tsconfig of any app (`noUncheckedIndexedAccess` included) — the
  kit's `tsconfig.json` is that one, `consumer/` proves it on every push.
- The kit owns no dictionary and no current language: everything it draws
  takes the app's translate function — `Translate<NoInfer<K> | KitKey>` in
  `renderControls` (K: the app's keys, inferred from its rows),
  `Translate<K | KitKey>` in `createProgress`, `Translate<KitKey>` where only
  the kit's strings are drawn. Its own strings are `kit.*` keys in
  `src/i18n/`, which apps spread into their dictionaries; messages from the
  core and the worker are codes, translated when shown.
- Time, randomness, storage and browser APIs are parameters, so tests fake
  them.
- Typed arrays in geometry loops are read as `a[i]!`: the indices come from
  the loop's bounds or a checked mesh (`3d/mesh.ts` says so at its top).
- `3d/viewer` is the only module vitest does not load; the showcase's smoke
  drives it (and the showcase's module worker) in Chromium.
- No `as` casts in sources (`typescript/no-unsafe-type-assertion`); tests
  may cast test doubles.
- An option is added to a module only when two apps need it; otherwise the
  app wraps the kit's piece.

## Test-driven development is mandatory

Every behaviour change goes red → green → refactor: a failing test first,
seen failing for the expected reason; then the code. Pure logic →
`*.test.ts` in node; the DOM → jsdom (`// @vitest-environment jsdom`); what
needs a real browser → a step in `scripts/smoke.mjs` over the showcase.

## Layout

- `src/core/` — no DOM: `message` (the i18n contract's types, `Message`),
  `format`, `history`, `storage`, `projectFile`, `presets`, `progress`
  (the `JobProgress` type) (`docs/core.md`).
- `src/i18n/` — the kit's own strings, `kit.*` keys, en ru uk he; `en.ts`
  defines `KitKey`.
- `src/ui/` — DOM, no three: `controls` (the panel), `stepper` (−/+ held),
  `card`, `sheet`, `progress`, `banner`, `modal`, `presetList`,
  `historyKeys`, `languagePicker`, `dom`, `timers`, `files` (`docs/ui.md`).
- `src/styles/` — `tokens.css` (palette, accents, density) and `kit.css`
  (everything in `@layer kit`, imports the tokens); the rules CSS cannot
  say are in `docs/design.md`.
- `src/3d/` — `mesh`, `validate`, `stl` (no three, workers use them) and
  `viewer` (three) (`docs/3d.md`).
- `src/worker/` — `protocol`, `client` (`WorkerClient`, `moduleWorker`),
  `serve` (`serveJobs`) (`docs/worker.md`).
- `src/csg/` — a worker's, on manifold-3d (an optional peer): `manifold`
  (`initCSG`, `CsgScope`, `toManifold`, `fromManifold`, `outerOutline`),
  `thread` (`ThreadForm`, `threadSection`, `threadRod`, `threadHole`);
  tested on the real WASM in node (`docs/csg.md`).
- `showcase/` — a Vite page with every component, laid out as an app on the
  kit, its box built by a module worker (`box.worker.ts`) and shown by the
  viewer (the root of `vite.config.ts`); deployed to Pages. `?accent=…&lang=…&
  view=iso|top|front&sheet=open&modal=presets&progress=running|label&
  banner=full|blocked&frame=phone` open a state directly (the smoke's
  screenshots use them). `scene.ts` is its SVG stand-in without WebGL.
- `consumer/` — a fixture app that gets the packed kit in its `node_modules`.
- `scripts/harness.mjs` + `harness.d.mts` — exported as `maker-kit/harness`
  (`docs/harness.md`); `harness.test.ts` tests its pure parts.
- `docs/` — design and module docs.

## Scripts

- `scripts/consumer.mjs` — `npm run consumer`: the kit as an installed package
  (tsc, vitest, vite build, the dev server with a csg worker).
- `scripts/smoke.mjs` — `npm run smoke`: the showcase in every accent and
  language at phone and desktop width; the panel's place, the sheet, the
  dialog, the banner; the worker's mesh in the viewer, the camera chips, the
  STL export; the bar's delay and overlap; −/+ held, undo keys, the presets
  flow, a tap on the view, folding across a language switch, the harness's
  CPU throttling. `--shots`
  saves 37 screenshots to `shots/` for a design review.
- `scripts/harness.mjs` — the Playwright plumbing (server, pages, steps and
  the run, downloads, STL, throttling); apps import it as `maker-kit/harness`.

## What costs what

- `npm run check`: ~4 s (257 tests; `threadHole`'s 1.5 s of them).
  `npm run consumer`: ~8 s (its page waits for a csg worker's rod).
  `npm run smoke -- --preview`: ~20 s (a build, 24 accent × language × width
  states, 13 steps). CI: about a minute.

## Conventions

- Code comments, docs and README in English.
- A helper script that may be needed again goes to `scripts/` with a header
  comment and a line in this file. A new browser check is a step or a flag in
  `scripts/smoke.mjs`, not a new file.
- Each milestone gets its own branch and a pull request.
