# maker-kit

The shared pieces of the 3D-printing tools — the apps below and the ones to
come: the controls panel, undo, storage, presets, the mobile sheet, the
progress bar, the worker queue, STL, the 3D view, the list card and the
message list, booleans on manifold and the printed thread, the smoke
harness and the design code they share.

A source-only TypeScript package: no build step, installed by a git tag.
Every component in every state: the showcase,
<https://dmitryweiner.github.io/maker-kit/>.

## Apps on the kit

| App | What it makes | Moved to the kit |
|---|---|---|
| [Plate Builder](https://dmitryweiner.github.io/plate-builder/) · [code](https://github.com/dmitryweiner/plate-builder) | A flat plate: a sign, a keychain, a tag | M1 |
| [Cast Builder](https://dmitryweiner.github.io/cast-builder/) · [code](https://github.com/dmitryweiner/cast-builder) | Slip-casting molds from a ready STL | M2 |
| [Case Constructor](https://dmitryweiner.github.io/case-constructor/) · [code](https://github.com/dmitryweiner/case-constructor) | An enclosure for a PCB: the shell and its lid | M3 |
| [ClayForm](https://dmitryweiner.github.io/clayform/) · [code](https://github.com/dmitryweiner/clayform) | Clay pottery from parameters | M4 |
| [MathSculpt](https://dmitryweiner.github.io/mathsculpt/) · [code](https://github.com/dmitryweiner/mathsculpt) | Vases, bowls and tori from math formulas | M5 |

Each app pins a tag of the kit in its `package.json`. The milestones, their
PRs and the kit fixes they found are in [plans/PLAN.md](plans/PLAN.md)'s
status.

## Install

```json
"dependencies": { "maker-kit": "github:dmitryweiner/maker-kit#v0.5.3" }
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
A new tool on the kit: `~/projects/_conventions/3d-tools.md` (the
`/new-web-app` skill's "3D tool").

The plan and its decisions: [plans/PLAN.md](plans/PLAN.md).

## License

GPL-3.0-or-later — see [LICENSE](LICENSE).
