# maker-kit — plan

A shared library for the 3D-printing tools in `~/projects`: Case Constructor,
Plate Builder, Cast Builder, and the ones to come. Each of them has written
the same pieces again — the controls panel, undo, storage, presets, the
mobile sheet, the worker queue, STL, the 3D view, the smoke harness — and
each copy has grown features the others lack. maker-kit takes the best of
the three into one tested package, plus the design code they share.

This file is the plan to agree on before any code: the API of every module,
what is taken from which project, the order of work. Decisions taken with
the user are at the top; deviations go to the end as they happen.

## Decisions made with the user (2026-11-06)

| Question | Decision |
|---|---|
| Shared code or a written spec | **A separate repository with code**, its own tests and docs; `_conventions/` gets a short page pointing to it. |
| Name | **maker-kit** |
| Scope | Design code, standard controls, settings persistence (undo included), presets — plus whatever else the three projects duplicate (below). |
| Distribution | **Git tags**: `"maker-kit": "github:dmitryweiner/maker-kit#v0.4.0"`. No npm publishing for now: the kit is internal. A source-only TypeScript package, no build step. Joint work on an app and the kit uses `npm link ../maker-kit`; CI of every app installs the tag. |
| TypeScript | **TS 7 only.** Every app will be on TS 7; the kit is not made to compile under TS 5.9. Case Constructor is not moved now: its migration (M3) waits until it is on TS 7. |
| License | **GPL-3.0-or-later**, as the apps. |
| Plate Builder's new pieces (2026-11-08) | **Into the kit**: 📄 New in the top bar (a blank preset, one undo step), the progress bar over the view (a running stripe after 300 ms while any job runs), and Ctrl/⌘+Z on any keyboard layout and from a slider, check box or select. |
| A blank Cast Builder project (2026-11-08) | **No model at all**: 📄 New empties the view to its "open a model" state with the default setup. |

## Defaults taken without asking (say if any is wrong)

- **Languages of the kit's own strings: en, ru, uk, he** (the union of the
  three apps). An app takes the ones it ships.
- **Dark theme only**, as all three apps are now. Tokens leave room for a
  light one later.
- **Full RTL mirroring** (`dir="rtl"`, logical properties), as Plate Builder
  does. Case Constructor mirrors only text today: it gets the full mirroring
  when it moves to the kit (a visible change, checked by its smoke).
- **−/+ repeat while held** everywhere (Case Constructor and Cast Builder do,
  Plate Builder does not): a click is one undo step, a hold is one undo
  step for the whole run.
- **The exact number field in every slider row** (Plate Builder's decision
  "as Case Constructor plus the exact field").
- **One id scheme for controls** (below). The apps' smoke selectors are
  updated mechanically during each migration.
- **No new features during migration.** A migration replaces an app's
  module with the kit's and keeps its behaviour, except the points listed in
  that migration's step.

## Open questions

None at the moment.

## What the three apps have

| Piece | Case Constructor | Plate Builder | Cast Builder | Taken from |
|---|---|---|---|---|
| Controls | 312 lines; range, select, segmented, toggles, check, text, button; `disabled`; hold-to-repeat −/+ | 221; range, select, check, textarea; limits and options from state, exact field, unit, aria on −/+, `change(next, final)` | 229; range, select, check; limits from state, value buttons under a slider, a note under a check, hold-to-repeat | the union; API shape of Plate Builder |
| Undo | `push`/`replace` + a 500 ms timer in `main.ts` | `live`/`commit` gestures, `reset`; opening a preset or a file is one step | none | Plate Builder |
| Shortcuts | Ctrl/⌘+Z by `event.key`, skipped in any form field | Ctrl/⌘+Z, Y, D by `event.key`, else `event.code` (Cyrillic, Hebrew layouts); only text fields keep their own undo | — | Plate Builder |
| New project | — | 📄 first in the top bar: a blank preset not listed in the dialog, one undo step | — | Plate Builder |
| Storage | `writeStorage` → `'ok' \| 'blocked' \| 'full'`, current project key | one versioned record: language, project, user presets; v1 → v2 migration | two versioned keys (settings, model), quota-aware | Case Constructor's write result + Plate Builder's record + Cast Builder's second key |
| Presets | built-in from partial JSON laid over defaults; user presets keyed by name; auto names per language; signature for "still this preset"; two-tap delete | built-in per-locale names; user presets with ids, rename in place; "changed" mark | none | merged |
| Project file | `{ app, version, name, savedAt, state }`, legacy bare state accepted | `{ app, version, state }`, refusal reasons `broken`/`foreign`/`newer` | — | merged |
| Fold card | `createCard`, snapshot/restore across re-render | element accordion | — | Case Constructor |
| Mobile sheet | — | open/close buttons, `onChange` | tap on the view closes, gestures pass through, `onInset` | merged |
| Progress bar | delay, indeterminate, label as key or message | over the view: a running stripe after 300 ms while any job (mesh, outline) runs; the previous mesh stays; no text | delay, label as key or message | Case Constructor + Plate Builder |
| Storage banner | `storageNote` | banner text | — | Case Constructor |
| Messages from core/worker | code + params, `tm` | — | code + params, `tm` | shared |
| Worker client | one-deep queue | generic `WorkerClient<J, R>`: lanes, kept jobs, transfer, restart after a crash | one-deep queue | Plate Builder |
| Mesh checks | `validateMesh`, `assessExport` (messages) | `validateMesh`, `meshProblems` | `validateMesh`, `assessExport` | Case Constructor / Cast Builder |
| STL | encode | encode, `fileSlug` | encode, parse (binary + ASCII), weld, `isValidMesh` | union |
| 3D view | roles, captions, spots | grid under the plate, low light, camera presets | bed grid by size, inset under the sheet, axis colours | a base viewer; the rest stays in apps |
| Smoke harness | `openApp`, throttle, downloads | `launch`, `VIEWPORTS`, `check` | same as Plate Builder | merged |
| Tokens | 11 | 16 (+ editor colours) | 16 (+ axis colours) | Case Constructor's palette, accent per app |

## Package layout

```
maker-kit/
  src/
    core/        no DOM: history, storage, projectFile, presets, message, format
    ui/          DOM, no three: dom, controls, stepper, card, sheet, progress,
                 modal, banner, presetList, historyKeys, languagePicker, messageList
    3d/          mesh, validate, stl, viewer (three as a peer dependency)
    worker/      protocol, client, serve
    i18n/        the kit's own strings: en, ru, uk, he
    styles/      tokens.css, kit.css (@layer kit)
  scripts/       harness.mjs (Playwright), its d.mts
  showcase/      a Vite page with every component, deployed to Pages
  consumer/      a fixture app that installs the kit and runs tsc, vitest, vite build
  docs/          design.md, one page per module group
  plans/         this file
```

Layer rule: `core` imports nothing from the others; `ui` imports `core`;
`3d` and `worker` import `core`; nothing imports `ui` except apps. A lint
rule (`import/no-restricted-paths`) keeps it so.

`package.json` `exports` names every entry point, so an app imports only
what it uses: `maker-kit/core/history`, `maker-kit/ui/controls`,
`maker-kit/styles/kit.css`, `maker-kit/3d/stl`, `maker-kit/worker/client`,
`maker-kit/harness`. Peer dependencies: `three` (≥ 0.178), `playwright`
(optional, for the harness).

### Consuming TypeScript sources from node_modules

- Vite transforms them like the app's own files.
- Vitest runs files in `node_modules` with Node, which does not strip types
  there: the app sets `test.server.deps.inline: ['maker-kit']`.
- `tsc` checks the kit's sources with the app's `tsconfig`: the kit must pass
  the strictest options any app uses (`strict`, `noUncheckedIndexedAccess`,
  `noUnusedLocals/Parameters`, `verbatimModuleSyntax`, `isolatedModules`) on
  TS 7. Imports inside the kit are
  extensionless (`moduleResolution: Bundler` in every app).
- `consumer/` proves all of this in the kit's CI on every push (K0).

## i18n contract

The kit owns no dictionary of the app and no current language. Everything
it draws gets a translate function:

```ts
export type Params = Readonly<Record<string, string | number>>;
export type Translate<K extends string> = (key: K, params?: Params) => string;
/** A dictionary key, or ready text when there is nothing to translate (a port id, a font name). */
export type Label<K extends string> = K | { text: string };
```

- Case Constructor and Cast Builder pass their `t`; Plate Builder passes
  `(key, params) => format(messages[locale][key], params, locale)`.
- The kit's own strings (−/+ labels, undo/redo, the top bar's buttons'
  labels, "Delete?", storage notes, mesh problems, project file refusals,
  "Building…" and progress stages) live in
  `src/i18n/{en,ru,uk,he}.ts` under `kit.*` keys. An app spreads them into its
  dictionaries (`export const en = { ...kitEn, ... }`), so the app's
  dictionary type includes them and its "every key in every language" test
  covers them. Components require `K extends KitKey`.
- `format(template, params, locale)`: `{name}` and `{n|one|few|many}` plural
  forms by `Intl.PluralRules` — Case Constructor's and Cast Builder's syntax.
- `Message = { code, params? }` travels from the core and the worker; the app
  turns it into text when shown (the language may change mid-job).
- A language switch is a re-render: every component keeps its state across
  one (folded cards, an open sheet, a list's scroll).

Locale detection and the switcher's storage stay in the app
(`web-app-template`'s `detectLocale`); the kit offers the picker's UI only.

## Modules

### core/history — undo and redo

Plate Builder's class, unchanged in spirit:

```ts
class History<T> {
  constructor(initial: T, limit?: number);          // limit 100
  readonly state: T;
  readonly canUndo: boolean;
  readonly canRedo: boolean;                         // false during a gesture
  live(state: T): void;     // a frame of a gesture: shown, not a step
  commit(state: T): void;   // end of an edit: one step from before the gesture; no-op steps dropped
  undo(): T | null;         // during a gesture: back to before it
  redo(): T | null;
  reset(state: T): void;    // the app's start, a storage reset: no steps either way
}
```

- Opening a preset, 📄 New or a project file is one `commit`: undo brings
  the previous project back (Plate Builder and Case Constructor both do
  this). `reset` is not for them.
- Equality by JSON text (all three agree: states are plain data).
- Case Constructor's 500 ms timer goes away: its controls start reporting
  `final` (below). A text field reports `final` on `change` (blur/Enter).
- Tests: Plate Builder's 68 lines + Case Constructor's 48, merged.

### ui/historyKeys — buttons and shortcuts

```ts
bindHistory(o: { undo: HTMLButtonElement; redo: HTMLButtonElement; onUndo(): void; onRedo(): void;
                 canUndo(): boolean; canRedo(): boolean }): { refresh(): void };
/** The letter of a Ctrl/⌘ shortcut on any layout: `event.key` if Latin, else the key's place (`event.code`). */
shortcutLetter(event: KeyboardEvent): string;
/** A field with typed text and so an undo of its own: a textarea, an input but range, checkbox, radio, color, file, buttons. */
isTextEntry(target: EventTarget | null): boolean;
```

Ctrl/⌘+Z, Shift+Ctrl/⌘+Z, Ctrl/⌘+Y (Plate Builder):

- Matched by `shortcutLetter`: on a Cyrillic or Hebrew layout `event.key` is
  `я` or `ז`, and a match on it did nothing. Apps use the same helper for
  their own shortcuts (Plate Builder's Ctrl+D duplicate).
- Skipped only while focus is in a text entry (its own undo of the text
  wins). A slider, a check box or a select keeps the focus after a change —
  skipping on any form field meant Ctrl+Z did nothing right after a drag.
- Tests: Plate Builder's — a Cyrillic `я` with `KeyZ` undoes, Ctrl+Z after a
  slider undoes, Ctrl+Z in a text field does not.

### core/storage — what survives a reload

```ts
type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
type StorageWrite = 'ok' | 'blocked' | 'full';

interface StoredRecord<V> {
  key: string;                       // `${__APP_ID__}`, `${__APP_ID__}-model`, or a legacy key
  version: number;
  /** sanitise a stored value of this or an older version; null: start fresh */
  read(data: unknown, version: number): V | null;
}

browserStorage(): KeyValueStorage | null;
loadRecord<V>(storage: KeyValueStorage | null, record: StoredRecord<V>): V | null;
saveRecord<V>(storage: KeyValueStorage | null, record: StoredRecord<V>, value: V): StorageWrite;
removeRecord(storage, record): void;
```

- Every read in try/catch, every field validated by the app's sanitiser;
  `read` gets the stored version and migrates (Plate Builder v1 → v2, Cast
  Builder v1 → v2 are this).
- A failed write says why: `full` (quota; Firefox's `NS_ERROR_DOM_QUOTA_REACHED`
  too) or `blocked`. The work is the person's: the banner (ui/banner) shows
  it, nothing is swallowed.
- Several records per app (Cast Builder keeps the heavy model apart so a
  slider never re-encodes it); all keys start with the app id: every app on
  `<user>.github.io` shares one origin.
- Tests: Case Constructor's write results, Plate Builder's and Cast
  Builder's migration and garbage cases (~400 lines between them).

### core/projectFile — the project as a file

```ts
encodeProjectFile<S>(o: { app: string; version: number; name: string; state: S; savedAt?: Date }): string;
decodeProjectFile<S>(text: string, o: { app: string; version: number; sanitize(state: unknown): S;
                     legacy?(data: unknown): S | null }):
  { ok: true; name: string; state: S } | { ok: false; reason: 'broken' | 'foreign' | 'newer' };
projectFileName(name: string, ext: string): string;   // `${fileSlug(name)}.${ext}`
fileSlug(name: string): string;                       // safe in every OS's paths
downloadText(name: string, text: string, type?: string): void;
pickFile(accept: string): Promise<File | null>;
```

`{ app, version, name, savedAt, state }`, indented JSON (kept next to the
STL, mailed, diffed). A file of another app or a random JSON is refused with
its reason, never read as defaults over the work. `legacy` keeps Case
Constructor's bare-state files opening.

### core/presets — built-in and the user's

```ts
interface BuiltInPreset<S> { id: string; build(): S; listed?: boolean }   // name and note from the app's dictionary; listed: false hides it from the dialog
interface UserPreset<S> { id: string; name: string; state: S }   // id `u<n>`, stable across renames
type PresetRef = `b:${string}` | `u:${string}` | '';

overlay(base: unknown, over: unknown): unknown;     // partial JSON laid over defaults (Case Constructor's preset files)
readUserPresets<S>(value: unknown, sanitize: (s: unknown) => S): UserPreset<S>[];
addUserPreset<S>(list, name, state): { list: UserPreset<S>[]; id: string };
renameUserPreset<S>(list, id, name): UserPreset<S>[];
removeUserPreset<S>(list, id): UserPreset<S>[];
nextPresetName(list, prefixes: readonly string[], prefix: string): string;   // "Preset 3", numbering across languages
presetStatus<S>(ref: PresetRef, state: S, find: (ref) => S | undefined, signature: (s: S) => string):
  'none' | 'same' | 'changed';
```

- A preset is known by its id; its shown name and note are dictionary keys
  (`preset.<id>.name`, `.note`), so names follow the language (Plate
  Builder) while the id and an English name go into file names (Case
  Constructor).
- `signature` leaves out what does not make a project different (view
  mode, export resolution): changed only by those, it is still the preset.
- The list is kept where the app keeps its project (a record field or a
  record of its own); the functions are pure.
- Limits: name 60 characters, the list capped by the app.
- **New** (Plate Builder): the top bar's first button, 📄, opens the app's
  blank preset — `{ id: 'blank', listed: false }`, the defaults with nothing
  on them (Plate Builder: a 100 × 60 rectangle) — as one undo step. It is
  not in the presets dialog; its name comes from the dictionary
  (`preset.blank.name`, "New plate") and becomes the project's name; its
  status is `same` until the first edit, like any preset's. Every app on the
  kit gets the button; what "blank" means is the app's `build()`.

### ui/presetList — the presets dialog

Rows grouped: the user's first (with an empty note when none), then the
built-in. The open one is marked current, or "changed" once the project
differs. A user preset: rename in place (a field, committed on change),
open, delete in two taps (🗑 → "Delete?" for 3 s; no `confirm()` — it
blocks the page and the smoke). Shown in a `ui/modal` from the top bar's
"Presets…", as in Case Constructor and Plate Builder.

```ts
renderPresetList<K extends KitKey>(root: HTMLElement, o: {
  builtIn: readonly { id: string; label: string; note?: string }[];
  user: readonly { id: string; name: string }[];
  current: PresetRef; status: 'none' | 'same' | 'changed';
  t: Translate<K>;
  open(ref: PresetRef): void; rename(id: string, name: string): void; remove(id: string): void;
}): void;
```

### core/message and core/format

`Message = { code: string; params?: Params }`, `format` as above,
`isMessage` guard for messages coming through `postMessage`.

### ui/controls — the panel

Declarative rows over any state: how to read a value and how to write it;
the module draws, formats, syncs and reports.

```ts
interface Common<T, K> {
  key: string;
  label: Label<K>;
  hint?: K;                                   // tooltip on the label
  note?: { key: K; params?: Params; when?: (s: T) => boolean };   // a line under the row, always in sight
  when?: (s: T) => boolean;                   // hidden when it does nothing in this state
  disabled?: (s: T) => boolean;               // shown, not editable (a size computed elsewhere)
}
type Limit<T> = number | ((s: T) => number);
type Options<T, K> = readonly Option<K>[] | ((s: T) => readonly Option<K>[]);
type Option<K> = { value: string; label: K } | { value: string; text: string };

RangeControl     { kind: 'range'; min: Limit<T>; max: Limit<T>; step: number; unit?: K;
                   values?: { list: readonly number[]; suffix?: string };   // buttons under the slider: 0° 90° 180° 270°
                   get(s): number; set(s, v: number): T }
SelectControl    { kind: 'select'; options: Options<T, K>; optionDisabled?(s, value): boolean; get; set }
SegmentedControl { kind: 'segmented'; options; optionDisabled?; get(s): string; set }
TogglesControl   { kind: 'toggles'; options; optionDisabled?; get(s): readonly string[]; set(s, v: string[]): T }
CheckControl     { kind: 'check'; get(s): boolean; set }
TextControl      { kind: 'text'; maxLength: number; placeholder?: K; get(s): string; set }
TextAreaControl  { kind: 'textarea'; rows: number; maxLength: number; get; set }
ButtonControl    { kind: 'button'; button: K; apply(s): T }

renderControls<T, K extends KitKey>(container: HTMLElement, controls: readonly Control<T, K>[], o: {
  read(): T;
  change(next: T, final: boolean): void;      // final: one undo step; false while dragging or typing
  idPrefix: string;
  t: Translate<K>;
}): { sync(state: T): void };
```

Behaviour, each from where it was solved:

- **Range row**: `label | − slider + | exact field | unit` on one grid line,
  the label column ~96 px so Russian and Ukrainian labels wrap instead of
  squeezing the slider (Plate Builder). Decimals from the step, trailing
  zeros dropped. The field accepts a typed value, clamps it, and puts back
  the current one on garbage (Plate Builder).
- **−/+** step on the step's grid and clamp; disabled at the limits; a click
  is one final change; held, they repeat (150 ms) with non-final changes and
  one final at release (Case Constructor, Cast Builder via
  `ui/stepper`). `aria-label` "Decrease Width" (Plate Builder). Not in the
  tab order: the slider and the field are.
- **Limits and options from the state** (Plate Builder, Cast Builder); a
  select is refilled only when its options change, so an open list does not
  close under the finger (Plate Builder).
- **Text** rows never rewrite the field while it has focus (the caret would
  jump) (Plate Builder, Case Constructor).
- **Segmented / toggles** with `aria-pressed`, a group `role` (Case
  Constructor).
- **Value buttons** under a slider, outside the row's `<label>` so a click
  on their gaps does not reach the slider (Cast Builder).
- `when` hides the row with its note and value buttons; `disabled` greys
  it with `.disabled` (Case Constructor).
- Ids (one scheme for every app, used by smoke scripts):
  `<prefix>_<key>` the input; `_n` the exact field; `_dec` / `_inc`;
  `_<value>` a segment or toggle; `_note`.
- Tests: Plate Builder's 228 lines and Cast Builder's 80, merged, plus
  segmented, toggles, button and the hold-to-repeat timing (fake timers).

### ui/card — foldable cards

Case Constructor's `createCard` (title, tag, description, `setEnabled`:
unfolds when its feature turns on, never folds under the hand) and
`snapshotCards`/`restoreCards` across a re-render. Later (K7): the list card
of Plate Builder — a group "Texts · 2 / 10" with add, and an accordion of
items with visibility, duplicate, delete.

### ui/sheet — the panel as a bottom sheet on a phone

Cast Builder's sheet with Plate Builder's extras:

```ts
setupSheet(o: { panel: HTMLElement; button: HTMLButtonElement; close?: HTMLButtonElement;
                view?: HTMLElement;              // a tap on it closes; drags and pinches pass to the view
                narrow: NarrowQuery; open?: boolean;
                onInset?(px: number): void;      // how much of the view it covers: the 3D view centres above it
                onChange?(): void }): { open(); close(); isOpen(): boolean; refresh() };
```

A tap is one finger, < 300 ms, < 6 px. On a wide screen the CSS ignores it.

### ui/progress — a bar over the view

Case Constructor's bar and Plate Builder's view bar in one:

```ts
createProgress<K extends KitKey>(wrap: HTMLElement, o: { t: Translate<K>; timers?: Timers }): {
  /** Shows the bar while `job` runs; resolves as the job does. */
  track<R>(job: Promise<R>, o?: { label?: K | Message; delayMs?: number }): Promise<R>;
  /** Steps of the running job, from the worker's progress messages; none: a running stripe. */
  progress(p: JobProgress): void;
  dispose(): void;
};
```

- **One bar for any number of jobs**: it shows while any tracked job runs
  (Plate Builder's mesh and outline lanes overlap) and hides when the last
  one ends.
- **Delay**: it appears only once the work has run 300 ms, so a quick
  preview never flickers it; `delayMs: 0` for a job asked for with a button
  (an export). Timers are a parameter (fake timers in tests).
- **A running stripe** when nothing says how much is done (manifold says
  nothing from inside a boolean); divisions when the job reports steps.
- **Text is optional**: a label (a key or a `Message`, translated when
  drawn: the language may change mid-job) for a long export; the view's bar
  has none, only `role="progressbar"` and `aria-label` "Building…"
  (`kit.progress.building`).
- **The previous result stays** under the bar until the new one arrives;
  the bar takes no pointer events, so the view can still be turned.
- **Place**: the bottom of the view, above the phone's settings button and,
  on a wide screen, just above the status line (Plate Builder's CSS).

### ui/banner — what storage failed to keep

Case Constructor's storage note: the project's failure stays while it lasts;
a preset's failure is an event and can be dismissed. Built on
`StorageWrite`, strings in `kit.storage.*`.

### ui/modal, ui/languagePicker, ui/messageList

- **modal**: one dialog at a time, Esc and the backdrop close it, focus
  goes in and comes back; never `alert`/`confirm` (they block the page and
  the smoke). `<dialog>` if jsdom's support is enough, otherwise our own.
- **languagePicker**: the 🌐 button with endonyms (Case Constructor, Plate
  Builder).
- **messageList**: blockers, warnings and notes from `Message`s with their
  severity, the same look in every app (Case Constructor's warn lines,
  Plate Builder's warnings card, Cast Builder's blockers). K7.

### ui/dom

`el(id, Ctor)` and `make(tag, className?, text?)` — type-safe, no `as`.

### styles — the design code in CSS

- `tokens.css`: Case Constructor's palette — `--bg #15181c`, `--panel
  #1c2026`, `--card #252a31`, `--text #e4e9ef`, `--muted #94a0ad`, `--line
  #343b44`, `--warn #e3b341`, `--bad #e06c5c`, `--focus` — and the accent
  set every app overrides: `--accent`, `--accent-strong`, `--accent-soft`,
  `--on-accent`. Shipped accents: cyan `#4fb3d9` (Case Constructor), emerald
  `#34c38f` (Plate Builder), burgundy `#9e2a44` (Cast Builder, with its own
  warmer neutrals). Spacing, radius, font size and control height as
  tokens too.
- `kit.css` in `@layer kit`, so any app rule wins without a specificity
  fight: the layout (top bar, panel beside the view on a wide screen, the
  sheet on a phone), cards, rows, sliders, −/+, the exact field, segmented,
  value buttons, top bar and icon buttons, modal, banner, progress, preset
  list, message list.
- Density: 14 px text and 22–28 px controls on a desktop, 16 px and ≥ 40 px
  touch targets on a phone (Plate Builder's decision). One exception: the
  top bar's tool buttons are 36 px with a 4 px gap on a phone, so six of
  them leave the project's name some room on a 360 px screen; 40 px and
  6 px from 760 px up (Plate Builder). Logical properties
  only. App-specific colours (Plate Builder's editor, Cast Builder's axes)
  stay in the apps.

### 3d/mesh, 3d/validate, 3d/stl

```ts
interface SurfaceMesh { positions: Float32Array; normals: Float32Array; indices: Uint32Array }
interface IndexedMesh { positions: Float32Array; indices: Uint32Array }

validateMesh(mesh, areaEps?): MeshReport;            // finite, indices, watertight, volume, degenerate
assessExport(report, shouldBeClosed): { blockers: Message[]; warnings: Message[] };   // codes kit.mesh.*
signedVolume(positions, indices): number;

encodeSTL(mesh, o?: { name?: string; brand?: string }): ArrayBuffer;   // binary, mm
parseSTL(data: ArrayBuffer): IndexedMesh;            // binary or ASCII, welded, degenerate triangles dropped
weld(soup: Float32Array): IndexedMesh;
isValidMesh(mesh: IndexedMesh): boolean;             // for meshes from outside (a message, storage)
stlFileName(name: string): string;
```

The three `validate.ts` are one file with small edits; Cast Builder's STL
reader joins the writer. Tests: the three suites merged.

### 3d/viewer — the base of the 3D view

```ts
createViewer(canvas: HTMLCanvasElement, o?: { background?: string }): Viewer | null;   // null: no WebGL
interface Viewer {
  model: THREE.Group;                 // z-up content (printing convention), turned y-up for display
  setMeshes(parts: readonly { mesh: SurfaceMesh; material?: THREE.Material }[]): void;
  fitBed(widthMm: number, depthMm: number): void;   // a grid under the model, re-made when it outgrows it
  camera(preset: 'iso' | 'top' | 'front' | 'side' | 'bottom'): void;
  setInset(px: number): void;         // the sheet's height: keep the model centred above it
  render(): void;                     // on demand, not a loop
  dispose(): void;
}
```

Renderer, orbit controls, the light set (Plate Builder's low light that
shows a 0.2 mm relief), creased normals, resize, the grid, camera presets,
inset. What each app adds — Case Constructor's roles, captions, ghosts and
spots; Cast Builder's axes — it adds to `model` itself. Kept thin: vitest
does not load it; the showcase's smoke does.

### worker/protocol, worker/client, worker/serve

Plate Builder's generic client:

```ts
class WorkerClient<J, R> {
  constructor(factory: WorkerFactory<J>, policy: { lane(job: J): string; kept(job: J): boolean;
              transfer?(job: J): Transferable[] });
  run(job: J, onProgress?: (p: JobProgress) => void): Promise<{ result: R; ms: number } | null>;
}
moduleWorker<J>(url: URL): WorkerFactory<J>;        // new Worker(url, { type: 'module' }) wired to receive/broke
serveJobs<J, R>(handle: (job: J, progress: (p: JobProgress) => void) => Promise<{ result: R; transfer?: Transferable[] }>): void;
```

- One worker, lazy; one waiting job per lane, replaced by a fresher one
  (resolves `null`: "no longer wanted", not an error); a kept job (an
  export asked for with a button) is never replaced by a preview; a crashed
  worker fails what waits and the next job starts a fresh one.
- `serveJobs` is the worker side: progress messages, timing, errors as
  messages — what each `csg.worker.ts` repeats.
- `JobProgress.label` is a `Message`.
- Loading manifold once and the mesh ⇄ manifold conversions (Case
  Constructor's and Cast Builder's `csg.ts`) are a candidate for K7.
- Tests: Plate Builder's 181 lines + Cast Builder's 54.

### harness — the Playwright smoke plumbing

`maker-kit/harness` (`scripts/harness.mjs` with a `.d.mts`): Plate
Builder's and Cast Builder's `launch({ preview, ports })` with `VIEWPORTS`,
`check`, `label`, error collection; Case Constructor's CPU throttling and
downloads; ports passed by the app (each keeps its own pair). The app keeps
its `scripts/smoke.mjs`.

## Showcase — the living design code

`showcase/` is a Vite page deployed to the kit's GitHub Pages:

- every control kind in every state (hidden, disabled, at the limits, with
  a note, with value buttons, an invalid typed value), a card, the top bar
  with all its buttons (📄 New first), the preset dialog, a modal, the
  banner, the progress bar in each mode (two overlapping fake jobs, a quick
  one that never shows it, an export with a label), a message list, the
  sheet, a viewer with a sample mesh;
- switches for the accent (cyan, emerald, burgundy), the language (en, ru,
  uk, he — RTL), and a phone frame;
- the kit's smoke opens it at phone and desktop width in each accent and
  language, fails on console errors and horizontal scroll, and with
  `--shots` saves screenshots for a design review.

`docs/design.md` writes down the rules the CSS cannot: the layout (panel
beside the view, sheet on a phone, the top bar's actions and their order:
the project's name opening the presets, then 📄 new, 💾 save as preset, 📂
open a file, ⬇️ save it, ↶ ↷, 🌐 — on a phone two lines: the brand and the
language, then the name and the buttons),
card folding, the slider row's anatomy, number formatting and units,
severity colours, destructive actions in two taps, no system dialogs, icons
in the top bar, the id scheme, RTL, density and touch targets.

## Milestones

Every milestone is a branch and a PR in maker-kit; `npm run check` and the
showcase smoke stay green; a module comes with its tests first (ported from
the apps, then extended).

- **K0 — Repository.** From `web-app-template` without the PWA: TS 7,
  oxlint + prettier, vitest, CI (check, consumer, smoke,
  Pages for the showcase). `LICENSE`: GPL-3.0-or-later. `consumer/` installs
  the kit by path and runs tsc, vitest (with `server.deps.inline`), vite
  build. Tag `v0.1.0`.
- **K1 — core.** history, storage, projectFile, presets, message, format;
  the kit's i18n strings.
- **K2 — controls.** dom, controls, stepper.
- **K3 — design.** tokens, kit.css, showcase, docs/design.md. Review the
  screenshots with the user before going on.
- **K4 — ui.** card, sheet, progress, banner, modal, presetList,
  historyKeys, languagePicker.
- **K5 — 3d and worker.** mesh, validate, stl, viewer; protocol, client,
  serveJobs.
- **K6 — harness.**
- **M1 — Plate Builder on the kit** (the newest, closest to the kit's API).
  One PR per group (core, controls + styles, ui, 3d + worker, harness);
  smoke green after each. Changes visible to the user: hold-to-repeat −/+.
  Its New, view bar and shortcuts move to the kit unchanged.
- **M2 — Cast Builder on the kit.** Visible: the exact field in slider rows,
  undo/redo (it has none), Case Constructor's palette structure under its
  burgundy, the view bar over its preview (its bar keeps the labelled mode
  for long jobs). 📄 New comes as a separate PR after the migration: a blank
  project has **no model** — the view goes back to its "open a model" state,
  the setup to its defaults, and the stored model record is removed. Undo
  brings the model back, so the history holds the model by reference (an id
  in the state, the mesh kept apart, as its storage already keeps it in a
  record of its own): the history's JSON comparison must never stringify a
  mesh of a million triangles.
- **K7 — what the migrations show is shared next**: the list card and
  accordion, messageList, the manifold helpers, the thread profile (Case
  Constructor and Cast Builder each have one).
- **C1 — Conventions.** `_conventions/3d-tools.md`: a 3D tool is built on
  maker-kit; how to add it to a project; the `new-web-app` skill gets a
  "3D tool" option that adds the kit, the viewer, the worker and the
  layout.
- **M3 — Case Constructor on the kit** — not scheduled yet. Its condition
  is met: Case Constructor moved to TS 7 + oxlint on its own (2026-11-08,
  `_conventions/stack.md`); when to schedule it is the user's call.
  The largest app. Visible: full RTL mirroring, the exact field, Ctrl+Z on
  any layout and after a slider; 📄 New as a separate PR after it; its 500 ms
  undo timer replaced by final changes; its user presets get ids (stored
  names migrate). Until then it keeps its own modules; what the kit learns
  from it (K7) comes by reading its code, not by importing.

## Risks

- **Source-only package**: if Vite's dependency pre-bundling or vitest
  trips over `.ts` files in `node_modules`, K0's consumer shows it first. Fallback: build to JS + `.d.ts` in a `prepare` script.
- **Migration breaks a smoke**: ids change by design; everything else must
  not. Each migration PR updates selectors in one commit, separately from
  behaviour.
- **The kit grows app-specific options** to fit one app: an option is added
  only when two apps need it; otherwise the app wraps the kit's piece.
- **Two places to edit** (kit and app) slow a quick fix: `npm link` for joint
  work; a kit release is a tag, no publishing step.
- **Three.js versions differ** (0.178, 0.186, 0.187): the apps align on one
  during their migration; the peer range stays wide.

## Not in v1

- A light theme.
- React bindings.
- The 2D editor of Plate Builder (one app needs it).
- Domain geometry: lids, molds, plates, holes.

## Deviations

- **K0 — layer rule** (2026-11-09): oxlint 1.90 has no
  `import/no-restricted-paths`. The layers are kept by `no-restricted-imports`
  with an override per folder (`.oxlintrc.json`): each folder lists the
  imports it may not use (regex patterns), `three` and `node:*` included.
- **K0 — vitest and `server.deps.inline`** (2026-11-09): vitest 4.1 runs the
  kit's `.ts` files from `node_modules` without it (checked in `consumer/`
  with the option removed). The consumer and the README keep it: it costs
  nothing and holds if vitest's default changes.
- **K0 — the consumer gets the packed kit** (2026-11-09): `npm pack`
  extracted into `consumer/node_modules/maker-kit`, not `file:..` (a symlink
  would resolve outside `node_modules` and prove nothing). The pack honours
  `files`, as a git dependency does; the kit's tests are left out of it.
- **K1 — `StoredRecord.write`** (2026-11-09): a record says how its value is
  stored as well as how it is read: `write(value)` gives the fields kept
  beside `version`. An app moving to the kit keeps the shape it stores today
  (`{ version: 2, settings }` in Plate Builder, `{ version, name, ref, state }`
  in Case Constructor) and nothing needs migrating. `read(data, version)`
  gets the parsed JSON as it is; a value stored with no version (Case
  Constructor's user presets, a bare list) comes as version 0.
- **K1 — files in `ui/files`, not `core/projectFile`** (2026-11-09):
  downloading and the file dialog touch the page, and core has no DOM.
  `download(name, data, type)` takes text or bytes (a project file or an
  STL) in place of `downloadText`.
- **K1 — small additions** (2026-11-09): `fileSlug(name, fallback)` and
  `projectFileName(name, ext, fallback)` take the word for an empty name
  (Plate Builder `plate`, Case Constructor `preset`); `presetRef` and
  `isPresetRef` build and check refs read from storage; a nameless stored
  user preset is named by its id rather than dropped.
- **K1 — `kit.file.foreign` names no app** (2026-11-09): "This file is not a
  project of this app." An app name in the sentence would need its own
  grammatical case in Russian and Ukrainian.
- **K2 — `Translate<NoInfer<K> | KitKey>`, not `K extends KitKey`**
  (2026-11-09): `K extends KitKey` would make the app's keys a subset of the
  kit's. A component takes the app's keys `K` (inferred from its rows only)
  and a translate function that also takes every kit key; an app whose
  dictionary misses the kit's strings does not compile.
- **K2 — −/+: a pause before the repeat** (2026-11-09): held, they repeat
  every 150 ms after 400 ms (Case Constructor and Cast Builder repeated from
  the first 150 ms, so a slow click stepped twice). A press is a live change
  and the release the final one: a click is a live step plus a final change
  (Plate Builder had one final change), still one undo step.
- **K2 — names** (2026-11-09): value buttons have ids `<prefix>_<key>_v<value>`
  and class `value-btn` (Cast Builder's `preset-btn`: "preset" means a whole
  project in the kit); a segmented group is labelled by `<id>_label`; the
  row's name is `row-name` (Plate Builder's, Case Constructor had
  `row-label`). Timers are `ui/timers` (`window.setTimeout` is the page's).
- **K2 — for K3** (2026-11-09): `when` hides rows by `hidden`; `kit.css`
  must keep `[hidden] { display: none !important }`, or a row's
  `display: grid` shows a hidden row (the showcase smoke caught it).
- **K3 — the kit's strings for K4 came early** (2026-11-09): the top bar's
  tools, the sheet, the dialog, the presets list and "Building…"
  (`kit.topbar.*`, `kit.sheet.*`, `kit.modal.close`, `kit.preset.*`,
  `kit.progress.building`), so the showcase draws them in four languages.
- **K3 — the sheet, the dialog, the bar and folding are drawn by hand in the
  showcase** (2026-11-09) until K4's modules replace that code; kit.css
  styles the markup they will make (`.fcard*` after Case Constructor's
  `createCard`, `.view-progress` / `.progress-track` / `.progress-fill`,
  `.modal` / `.modal-box`, `.preset-*`, `.messages` / `.message`).
- **K3 — accents by `data-accent` on `<html>`** (2026-11-09): `cyan` is the
  default; `burgundy` brings Cast Builder's warmer neutrals and the warn
  yellow as the focus ring (burgundy is too dark for one).
- **K3 — text fields `dir="auto"`, the view's status `unicode-bidi: plaintext`**
  (2026-11-09): in Hebrew, "60 × 30 mm" turned into "mm 30 × 60" and a Latin
  text ran right to left.
