# Agents guide

maker-kit — the shared library of the 3D-printing tools in `~/projects`
(Case Constructor, Plate Builder, Cast Builder): controls, undo, storage,
presets, the mobile sheet, the progress bar, the worker queue, STL, the 3D
view, the smoke harness and the design code. A source-only TypeScript
package (no build step), installed by git tag:
`"maker-kit": "github:dmitryweiner/maker-kit#v0.1.0"`.

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
  app's tsc, vitest and vite build over it.
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
  K0–K7, M1–M3, C1; deviations at its end.

## Architectural invariants

- Layers: `core` and `i18n` import nothing else of the kit; `ui` imports
  `core` and `i18n`; `3d` and `worker` import `core` and `i18n`; nothing in
  the kit imports `ui` (the showcase does). Only `3d` imports `three`; no
  source imports `node:*`. `.oxlintrc.json` enforces it with
  `no-restricted-imports` per folder.
- `core` has no DOM: functions that touch the page (download, file picker)
  live in `ui`.
- Sources are TypeScript, imported extensionless; they must pass the
  strictest tsconfig of any app (`noUncheckedIndexedAccess` included) — the
  kit's `tsconfig.json` is that one, `consumer/` proves it on every push.
- The kit owns no dictionary and no current language: everything it draws
  takes a `Translate<K>`; its own strings are `kit.*` keys in `src/i18n/`,
  which apps spread into their dictionaries.
- Time, randomness, storage and browser APIs are parameters, so tests fake
  them.
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
  `format`, `history`, `storage`, `projectFile`, `presets` (`docs/core.md`).
- `src/i18n/` — the kit's own strings, `kit.*` keys, en ru uk he; `en.ts`
  defines `KitKey`.
- `src/ui/` — DOM, no three: `files` (download, the file dialog); more with
  K2 and K4.
- `src/3d/`, `src/worker/`, `src/styles/` — filled by K3–K5.
- `showcase/` — a Vite page with every component (the root of
  `vite.config.ts`); deployed to Pages.
- `consumer/` — a fixture app that gets the packed kit in its `node_modules`.
- `scripts/harness.mjs` + `harness.d.mts` — exported as `maker-kit/harness`.
- `docs/` — design and module docs.

## Scripts

- `scripts/consumer.mjs` — `npm run consumer`: the kit as an installed package.
- `scripts/smoke.mjs` — `npm run smoke`: the showcase in a browser.
- `scripts/harness.mjs` — the Playwright plumbing; apps import it as
  `maker-kit/harness`.

## What costs what

- `npm run check`: ~2 s. `npm run consumer`: ~3 s. `npm run smoke -- --preview`: ~5 s.

## Conventions

- Code comments, docs and README in English.
- A helper script that may be needed again goes to `scripts/` with a header
  comment and a line in this file. A new browser check is a step or a flag in
  `scripts/smoke.mjs`, not a new file.
- Each milestone gets its own branch and a pull request.
