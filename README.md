# maker-kit

The shared pieces of the 3D-printing tools — [Case Constructor](https://github.com/dmitryweiner/case-constructor),
[Plate Builder](https://github.com/dmitryweiner/plate-builder), [Cast Builder](https://github.com/dmitryweiner/cast-builder)
and the ones to come: the controls panel, undo, storage, presets, the mobile
sheet, the progress bar, the worker queue, STL, the 3D view, the smoke
harness and the design code they share.

A source-only TypeScript package: no build step, installed by a git tag.

## Install

```json
"dependencies": { "maker-kit": "github:dmitryweiner/maker-kit#v0.1.0" }
```

Each module is its own entry point, so an app imports only what it uses:

```ts
import { isMessage, type Translate } from 'maker-kit/core/message';
```

The app's toolchain compiles the kit's sources:

- Vite and `tsc` take them as they are (`moduleResolution: "Bundler"`).
- Vitest: `test.server.deps.inline: ['maker-kit']` in `vite.config.ts`, so
  the kit is transformed like the app's own files.
- `three` is a peer dependency; `playwright` too, optional, for
  `maker-kit/harness`.

## Develop

```sh
npm ci
npm run dev        # the showcase
npm run check      # typecheck, lint, unit tests
npm run consumer   # the kit as an installed package
npm run smoke      # the showcase in a browser
```

Working on an app and the kit together: `npm link ../maker-kit` in the app.

The plan and its decisions: [plans/PLAN.md](plans/PLAN.md).

## License

GPL-3.0-or-later — see [LICENSE](LICENSE).
