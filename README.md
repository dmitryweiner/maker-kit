# maker-kit

The shared pieces of the 3D-printing tools — [Case Constructor](https://github.com/dmitryweiner/case-constructor),
[Plate Builder](https://github.com/dmitryweiner/plate-builder), [Cast Builder](https://github.com/dmitryweiner/cast-builder)
and the ones to come: the controls panel, undo, storage, presets, the mobile
sheet, the progress bar, the worker queue, STL, the 3D view, the list card
and the message list, booleans on manifold and the printed thread, the
smoke harness and the design code they share. Plate Builder (M1) and Cast Builder
(M2) run on it; Case Constructor moves later (`plans/PLAN.md`).

A source-only TypeScript package: no build step, installed by a git tag.
Every component in every state: the showcase,
<https://dmitryweiner.github.io/maker-kit/>.

## Install

```json
"dependencies": { "maker-kit": "github:dmitryweiner/maker-kit#v0.4.0" }
```

Each module is its own entry point, so an app imports only what it uses:

```ts
import { History } from 'maker-kit/core/history';
import { renderControls } from 'maker-kit/ui/controls';
import { createViewer } from 'maker-kit/3d/viewer';
import 'maker-kit/styles/kit.css';
```

The app's toolchain compiles the kit's sources:

- Vite and `tsc` take them as they are (`moduleResolution: "Bundler"`); the
  kit passes the strictest options any app uses.
- Vitest: `test.server.deps.inline: ['maker-kit']` in `vite.config.ts`, so
  the kit is transformed like the app's own files.
- Vite's dev server: `optimizeDeps: { exclude: ['maker-kit'] }`. Its
  dependency pre-bundling reads the kit's TypeScript as JavaScript and the
  server dies (a worker's import of `maker-kit/3d/mesh` showed it); excluded,
  the kit is served like the app's own files. `vite build` does not need it.
- A job worker: `worker: { format: 'es' }` in `vite.config.ts`.
- `three` is a peer dependency; `playwright` too, optional, for
  `maker-kit/harness`; `manifold-3d`, optional, for `maker-kit/csg/*`
  (and `optimizeDeps.exclude` for it: [docs/csg.md](docs/csg.md)).
- The app's dictionaries spread the kit's strings: `{ ...kitEn, … }` from
  `maker-kit/i18n/index`.

## Modules

| Group | Modules | Docs |
|---|---|---|
| `core` — no DOM | `message`, `format`, `history`, `storage`, `projectFile`, `presets`, `progress` | [docs/core.md](docs/core.md) |
| `ui` — the page, no three | `controls`, `stepper`, `card`, `listCard`, `messageList`, `sheet`, `progress`, `banner`, `modal`, `presetList`, `historyKeys`, `languagePicker`, `dom`, `timers`, `files` | [docs/ui.md](docs/ui.md) |
| `3d` | `mesh`, `validate`, `stl` (no three), `viewer` (three) | [docs/3d.md](docs/3d.md) |
| `worker` | `protocol`, `client`, `serve` | [docs/worker.md](docs/worker.md) |
| `csg` — a worker's, manifold-3d | `manifold`, `thread` | [docs/csg.md](docs/csg.md) |
| `i18n` | the kit's strings in en, ru, uk, he | [docs/core.md](docs/core.md#i18n--the-kits-strings) |
| `styles` | `tokens.css`, `kit.css` | [docs/design.md](docs/design.md) |
| `harness` | the Playwright plumbing of an app's smoke | [docs/harness.md](docs/harness.md) |

## Develop

```sh
npm ci
npm run dev        # the showcase
npm run check      # typecheck, lint, unit tests
npm run consumer   # the kit as an installed package
npm run smoke      # the showcase in a browser; -- --preview a build, offline too
```

Working on an app and the kit together: `npm link ../maker-kit` in the app.

The plan and its decisions: [plans/PLAN.md](plans/PLAN.md).

## License

GPL-3.0-or-later — see [LICENSE](LICENSE).
