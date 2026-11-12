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
| Distribution | **Git tags**: `"maker-kit": "github:dmitryweiner/maker-kit#v0.4.1"`. No npm publishing for now: the kit is internal. A source-only TypeScript package, no build step. Joint work on an app and the kit uses `npm link ../maker-kit`; CI of every app installs the tag. |
| TypeScript | **TS 7 only.** Every app will be on TS 7; the kit is not made to compile under TS 5.9. Case Constructor is not moved now: its migration (M3) waits until it is on TS 7. |
| License | **GPL-3.0-or-later**, as the apps. |
| Plate Builder's new pieces (2026-11-08) | **Into the kit**: 📄 New in the top bar (a blank preset, one undo step), the progress bar over the view (a running stripe after 300 ms while any job runs), and Ctrl/⌘+Z on any keyboard layout and from a slider, check box or select. |
| A blank Cast Builder project (2026-11-08) | **No model at all**: 📄 New empties the view to its "open a model" state with the default setup. |
| K7's scope (2026-11-10) | **All of it**: the manifold helpers, the thread profile, `serveJobs` answering a refused job, messageList (Plate Builder and Cast Builder move to it), the list card built now from Plate Builder's code and a reading of Case Constructor's, the banner's words without ⬇️, the offline check in the harness. |
| M3 (2026-11-12) | **Scheduled now.** Case Constructor's view goes onto the kit's viewer (the kit gets `onFrame` and `look`, `v0.5.0`); its PWA comes as a PR of its own after M3; 📄 New opens `plain-box`'s state. "M3 in detail". |

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

## Status (2026-11-12)

| Milestone | State |
|---|---|
| K0 — repository | done, on `main`, tag `v0.1.0` |
| K1 — core | done (PR #2) |
| K2 — controls | done (PR #3) |
| K3 — design | done, screenshots approved (PR #4) |
| K4 — ui | done (PR #5) |
| K5 — 3d and worker | done (PR #6), tag `v0.2.0` |
| K6 — harness | done (PR #7), tag `v0.3.0` |
| M1 — Plate Builder on the kit | done: plate-builder PRs #16–#21 (#21 carried #17–#19 to `main`), docs #22; on `v0.3.1` (the kit's fixes it found, PR #8) |
| M2 — Cast Builder on the kit | done: cast-builder PRs #11 core, #12 controls + styles, #13 ui, #14 3d + worker, #15 harness, docs #16, 📄 New #17; on `v0.3.1`, no kit fixes needed |
| K7 — what the migrations share | done: K7a csg + worker (#13), K7b ui (#14), K7c harness (#15), tag `v0.4.0`; Plate Builder on it (plate-builder PR #23), the fix it found in `v0.4.1` (#17); Cast Builder on `v0.4.1` (cast-builder PR #18) |
| C1 — conventions | done (2026-11-12): `_conventions/3d-tools.md`, `/new-web-app`'s "3D tool", run end to end on a fresh copy of the template |
| M3 — Case Constructor on the kit | scheduled 2026-11-12: "M3 in detail" below; next: m3-core |

Where a module's API below differs from what was built, the deviation at
the end of this file and `docs/` are right.

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
    ui/          DOM, no three: dom, controls, stepper, card, listCard, sheet, progress,
                 modal, banner, presetList, historyKeys, languagePicker, messageList
    3d/          mesh, validate, stl, viewer (three as a peer dependency)
    worker/      protocol, client, serve
    csg/         manifold, thread (manifold-3d as an optional peer; a worker's)
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
`maker-kit/csg/manifold`, `maker-kit/harness`. Peer dependencies: `three`
(≥ 0.178), `manifold-3d` (≥ 3.5, optional, for `csg`), `playwright`
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
  Constructor and Cast Builder each have one); and what M1 and M2 left for
  it. Its parts, their order and the apps' PRs: "K7 in detail" below.
- **C1 — Conventions.** `_conventions/3d-tools.md`: a 3D tool is built on
  maker-kit; how to add it to a project; the `new-web-app` skill gets a
  "3D tool" option that adds the kit, the viewer, the worker and the
  layout.
- **M3 — Case Constructor on the kit** — scheduled by the user
  2026-11-12 (Case Constructor moved to TS 7 + oxlint on its own,
  2026-11-08); its PRs: "M3 in detail" below. The largest app. Visible: full RTL mirroring, the exact field, Ctrl+Z on
  any layout and after a slider; 📄 New as a separate PR after it; its 500 ms
  undo timer replaced by final changes; its user presets get ids (stored
  names migrate). Until then it keeps its own modules; what the kit learns
  from it (K7) comes by reading its code, not by importing.

## K7 in detail (2026-11-10)

What the three apps still write each on their own, taken into the kit; then
Plate Builder and Cast Builder move onto it. Case Constructor takes these
pieces with M3; until then the kit reads its code (its thread, its lists of
labels and openings, its warnings list).

### csg/manifold — the bridge to manifold-3d

A new layer, `src/csg/`: the only one that imports `manifold-3d` (an
optional peer dependency, as `playwright`); it imports `core` and `3d/mesh`,
nothing imports it but apps' workers. Its runtime import is in
`csg/manifold.ts` only, so the pure parts of `csg/thread` load without WASM.

| Piece | Case Constructor | Plate Builder | Cast Builder |
|---|---|---|---|
| `initCSG()` — the WASM once per worker | ✓ | ✓ | ✓ |
| `CsgScope` — every object deleted at once | ✓ | ✓ | ✓ |
| `toManifold(csg, mesh, { merge? })` — throws with the reason on a mesh that is not a closed solid | ✓ (always merges) | — | ✓ (merges an imported STL) |
| `fromManifold(solid)` → `SurfaceMesh` with normals (positions out of `numProp > 3`) | ✓ | — | ✓ |
| `outerOutline(csg, scope, section)` — the outer rings, holes filled | — | ✓ (`fillHoles`) | ✓ |

Case Constructor's `hullOf`, `splitByPlane`, `extrude`, `unionAll` and its
affine `toMat4` stay in it until a second app needs them. Tests: the apps'
`csg.test.ts` merged, on the real WASM in node; the consumer imports
`maker-kit/csg/manifold` in a worker and builds.

### csg/thread — a printed thread

Case Constructor's form (Cast Builder's is the same with equal flanks): a
60° profile, flat crests and roots, a single-start right-hand thread as its
horizontal section extruded with a twist — closed by construction.

```ts
interface ThreadForm { d: number; pitch: number; depth: number; rise: number; fall: number }   // shares of the pitch
symmetricForm(d: number, pitch: number): ThreadForm;        // half a pitch deep, 30° flanks
minorRadius(form: ThreadForm): number;
threadSection(form, grow: number, points: number): [number, number][];   // pure
threadRod(csg, scope, form, grow: number, z0: number, z1: number, o: { points: number; slicesPerTurn: number }): Manifold;
```

`grow` widens a hole by its fit. Points and slices are the app's (Case
Constructor: a slice per point; Cast Builder: 16 slices per turn, 48 points
in an export). Sizes, screws, heads, stops and holes stay in the apps
(domain geometry). Tests: Cast Builder's sections come out the same to the
float, a rod is one closed solid of the expected volume, rods a whole
number of pitches apart are in phase.

### worker/serve — a refused job is answered

Today `serveJobs` drops what its `isJob` refuses and the client waits
forever (Cast Builder passes any object to get round it). A message with a
job id whose job is refused is answered with `error` and the code
`kit.worker.badJob`; one with no job id cannot be answered and is dropped.
Cast Builder then passes its real guard.

### ui/messageList — blockers, warnings, notes

```ts
type Severity = 'bad' | 'warn' | 'info';
interface MessageLine { severity: Severity; text: string; mark?: string;   // a badge before the text: Case Constructor's "⚠ 3"
                        action?: { label: string; run(): void } }          // Plate Builder's "show"
renderMessages(list: HTMLUListElement, lines: readonly MessageLine[]): void;   // the list hidden when empty
```

Texts come translated: the apps' warnings are not all `Message`s (Plate
Builder's name elements). The look is kit.css's `.messages` / `.message`,
already in the showcase. Plate Builder's Warnings card and Cast Builder's
two paragraphs (blockers, warnings) move to it; Case Constructor's badges
over the model and its hover stay in the app, its list moves at M3.
Visible in Cast Builder: a line per message with its colour bar.

### ui/listCard — a group of items, each with its own controls

From Plate Builder's element groups ("Texts · 2 / 10", add, an accordion of
items with visibility, duplicate, delete) and Case Constructor's labels
and openings (a box per item, its controls always open, ✕).

```ts
interface ListItem { id: string; title: string; hint?: string; icon?: string; visible?: boolean }   // visible absent: no switch
renderItemList(list: HTMLUListElement, o: {
  items: readonly ListItem[];
  body(id: string): HTMLElement | null;   // the row's controls: the app's node, moved in; null: folded
  t: Translate<KitKey>;
  select?(id: string | null): void;       // a head is a fold button only with it (Plate Builder's one open item)
  toggle?(id: string): void; duplicate?(id: string): void;
  remove(id: string): void;               // at once: undo brings it back
}): { syncHints(items: readonly ListItem[]): void };   // a text typed into an item changes its head in place
groupCount(n: number, max: number): string;            // "2 / 10"
```

- Rows are made again only when ids, titles, visibility or the open one
  change (Plate Builder's key; Case Constructor rebuilt on a length
  change): a click that blurs a field must find its button on mouseup, a
  text field keeps its focus.
- Ids: the row `<prefix>_<id>`, its buttons `_visible`, `_duplicate`,
  `_remove` (Case Constructor's `label0_remove` becomes `label_0_remove` at
  M3, mechanically).
- `aria-expanded` on a fold head; labels "Visible: Text 2", "Duplicate:
  Text 2", "Delete: Text 2" (`kit.list.*`).
- The add button and the count stay in the app's markup (the card's
  heading is the app's); the kit styles `.group-card`, `.item-*`.
- Plate Builder moves to it in K7. Case Constructor at M3.

### ui/banner — words that fit an app with no project file

The kit's project sentences say the fact only ("This browser does not keep
your project: …", "… its storage is full."); what to do is a second key the
app passes: `advice: { blocked: K; full: K }`. The kit offers
`kit.storage.advice.file` ("Save the project to a file with ⬇️ before
closing the page") for an app with a project file; Plate Builder's banner
reads as before. Cast Builder gets the banner with its own advice (open
the model again after a reload) and keeps its "too large to keep" note.

### harness — the offline check

`offline(app, { ready(page) })`: a visit warms the service worker's cache
(waits for `navigator.serviceWorker.ready`), the context goes offline, a
reload must show the app (`ready` checks it, e.g. the heading). Both apps
wrote it; the showcase gets a service worker (the template's `sw.js`
plugin) so the kit's own smoke runs it with `--preview`.

### Order

1. **K7a — csg and worker** (kit PR #13, done): `csg/manifold`, `csg/thread`, the
   refused job; `manifold-3d` as an optional peer and a dev dependency;
   the layer rule in `.oxlintrc.json`; the consumer builds a worker on it.
2. **K7b — ui** (kit PR #14, done): messageList, listCard, the banner's advice; the
   showcase draws them (a list card of three items, one folded open; the
   message list replaces its hand-made `<ul>`); `kit.list.*`,
   `kit.storage.advice.file`, `kit.worker.badJob` in four languages.
3. **K7c — harness** (kit PR #15, done): `offline`, the showcase's service
   worker.
4. **`v0.4.0`** (done): on `main`, one commit bumps `package.json` to
   0.4.0 and the install line (`#v0.3.1` → `#v0.4.0`) in README.md and
   AGENTS.md; the tag `v0.4.0` on it (AGENTS.md, "Releases"); the status
   above.
5. **Plate Builder on v0.4.0** (plate-builder PR #23, done; the kit's fix
   it found is `v0.4.1`, below): csg (its `csg.ts` → the kit's
   `initCSG`, `CsgScope`; `fillHoles` → `outerOutline`), messageList (its
   Warnings card; `data-code` kept), listCard (its element groups:
   `.element-*` → `.item-*`, row ids `<prefix>_<id>` — smoke selectors
   updated in one commit; its own `.group-count` CSS goes, so Hebrew reads
   "3 / 4", not "4 / 3"), the banner's `advice` (the kit's `file` keys:
   its words unchanged), `offline` in its smoke.
6. **Cast Builder on v0.4.1** (cast-builder PR #18, done): csg (`toManifold` with `merge`,
   `outerOutline`), thread (`THREAD` → `symmetricForm(10, 2)`,
   `threadRod` with `{ points, slicesPerTurn: 16 }`: its geometry tests
   hold unchanged), messageList (`#blockers` and `#warnings` → one list:
   a visible change, its smoke reads lines), its real job guard in
   `csg.worker.ts`, the storage banner with its own advice (no project
   file; its "too large to keep" note stays), `offline` in its smoke.

## M3 in detail (2026-11-12)

Case Constructor (37 000 lines, `main.ts` 1 578 of them) replaces its
copies of the kit's pieces with the kit's, on `v0.4.1` (or the release M3's
own kit changes make). Its geometry (`src/geo/`, `src/boards/`, the hinged
case) and its domain cards stay; what moves is listed per PR below. Its
rules hold during M3: `npm run check` and `npm run smoke` before every
commit, golden tests pin the geometry, the user merges.

### What Case Constructor has, and what takes its place

| Its module | The kit's | Notes |
|---|---|---|
| `state/history` (`push`/`replace` + 500 ms timer in `main.ts`) | `core/history` | `live`/`commit` from the controls' `final`; the timer goes |
| `state/storage`, `currentProject`, `userPresets` | `core/storage` records | its keys and shapes stay: `caseconstructor_current_v1` `{ version: 1, name, ref, state }`; the user presets' bare list is read as version 0 and gets ids (`u1`, …), written back as version 1; a ref `u:<name>` becomes `u:<id>` by the name |
| `state/presetFile` | `core/projectFile` | the same `{ app, version, name, savedAt, state }`; a bare state stays `legacy`; a refused file says why (`kit.file.*`); `case-constructor-<name>.json` kept by `projectFileName` |
| `state/presets` (`overlay`, `presetSignature`) | `core/presets` | `overlay`, `presetStatus` with its signature (no view, resolution, print layout); built-in names move into the dictionaries (`preset.<id>.name`) the same in every language: its rule, a name travels into file names |
| `i18n/index` (`t`, `tm`, `tDynamic`, plurals) | `core/format`, `core/message`, `kit.*` keys | its `t` stays the app's; the dictionaries spread the kit's; `Message` is the kit's, its `spot` an app field beside it |
| `ui/controls` (7 kinds, `Label`, `optionDisabled`, `disabled`) | `ui/controls` + `ui/stepper` | every kind exists in the kit; `change(next, final)`; the exact field in slider rows; −/+ after a 400 ms pause |
| `ui/card` | `ui/card` (made from it) | `snapshotCards`/`restoreCards` the same |
| boards, openings, labels, cables in `boardsCard`, `cutsCard`, `labelsCard`, `hingeCard` | `ui/listCard` | a box per item, controls always open (no `select`), ✕; ids `board0_remove` → `board_0_remove` (mechanical, one commit) |
| `ui/presetList` + its panel | `ui/presetList` in `ui/modal` | the user's presets first, rename in place, ↗ open, two-tap delete |
| `ui/storageNote` | `ui/banner` | advice `kit.storage.advice.file` / `.fileFull` (it has ⬇️); a preset's failure still dismissable |
| `ui/progress` | `ui/progress` | its labels as `Message`s; the bar over the view |
| its own sheet under 760 px, opened by ⚙ Settings | `ui/sheet` | the kit's sheet below 1024 px, the panel beside the view from there; `onInset` → the view's inset |
| `#warnings` + `#blockers` | `ui/messageList` | one list, the blockers first; "⚠ 3" as `mark`; hover and the picked line stay the app's (it marks the box over the model) |
| the 🌐 `<select>` | `ui/languagePicker` | the kit's button with endonyms |
| undo keys in `main.ts` | `ui/historyKeys` | Ctrl/⌘+Z on any layout and right after a slider |
| `geo/surface` (`SurfaceMesh`), `geo/stl`, `geo/validate` | `3d/mesh`, `3d/stl`, `3d/validate` | its largest-part check (`MAX_PART_MM`) stays in the app; `stlFileName` |
| `geo/csg` | `csg/manifold` | `initCSG`, `CsgScope`, `toManifold(…, { merge: true })`, `fromManifold`; `hullOf`, `splitByPlane`, `trimByPlane`, `extrude`, `transformSolid`, `unionAll`, `toMat4` stay |
| `geo/thread` | `csg/thread` | `threadSection`, `threadRod`, `threadHole`, a slice per point; its sizes, `screwShape`, engagement stay |
| `worker/client` (one-deep queue), `protocol` | `worker/client`, `worker/serve` | one lane: a preview replaced by a fresher one, an export kept; `serveJobs` with its real guard |
| `render/scene` | `3d/viewer` + `onFrame`, `look` (`v0.5.0`) | roles, captions, spots, x-ray stay the app's, added to `model` |
| `scripts/lib/harness.mjs` | `maker-kit/harness` | its ports 5273 / 4273; `parseArgs` with repeatable flags; `throttle`; a phone viewport |
| `style.css` (1 107 lines, desktop first) | `tokens.css` + `kit.css` | cyan is its accent (the kit's palette is its own); what stays is its own pieces, mobile first, logical properties |

### Visible changes

The plan's list — full RTL mirroring, the exact field, Ctrl+Z on any layout
and after a slider, final changes in place of the 500 ms timer, user
presets with ids — and, as M1 and M2 showed: the sheet on a phone and the
panel beside the view from 1024 px (was 760 px), the kit's density, the
presets dialog (rename in place, ↗), the banner's words, the kit's
sentences for a refused file and the export gate (`kit.mesh.*`), the
language button, one message list.

### Its PRs

As in M1 and M2: one PR per group, each based on `main` after the previous
one is merged (or its base deleted at once); the smoke green after each;
selectors changed in a commit of their own.

1. **m3-core** — the kit as a dependency (`optimizeDeps.exclude`,
   `test.server.deps.inline`); history (the timer still commits until
   PR 2), storage records, the project file, presets, messages and format,
   `kit.*` in the dictionaries.
2. **m3-controls** — controls and stepper; `final` replaces the timer;
   `tokens.css` and `kit.css` under its own CSS, mobile first, full RTL.
3. **m3-ui** — card, listCard (the four lists), modal + presetList, banner,
   progress, sheet, messageList, languagePicker, historyKeys, files.
4. **m3-3d** — mesh, stl, validate, csg, thread, the worker on
   `WorkerClient` and `serveJobs`, the view on `3d/viewer` (after the kit's
   `v0.5.0`: `onFrame`, `look`).
5. **m3-harness** — the smoke and `snap.mjs` on `maker-kit/harness`.
6. **m3-docs** — `docs/`, README, AGENTS.md / CLAUDE.md after it.
7. **📄 New** — its blank preset is `plain-box`'s state (no boards,
   100 × 70 × 35), `listed: false`, named "New case"; one undo step.
8. **PWA** — the template's manifest, `sw-plugin.ts`, `pwa.ts`; `offline`
   in its smoke.

The kit's changes M3 finds go to a kit PR and a release before the app's
PR that needs them, as `v0.3.1` and `v0.4.1` did.

### Decided with the user (2026-11-12)

1. **The 3D view goes onto the kit's viewer.** Case Constructor's scene
   draws every frame (captions follow the camera, overlapping ones give
   way), projects points for the smoke and puts the camera on any
   direction (`snap.mjs --camera`); the kit's viewer draws on demand and
   hides its camera. The kit gets `onFrame(listener)` — called with the
   camera after each drawn frame — and `look(direction)`, in a kit PR and
   `v0.5.0` before m3-3d. Roles, captions, spots and x-ray stay the app's,
   in `model`. Visible: the kit's light, the grid by the bed, the 1.7 × fit,
   frames on demand.
2. **PWA after M3**, a PR of its own after 📄 New (PR 8 above): it has no
   service worker, though nothing in it calls out.
3. **📄 New is `plain-box`'s state** (PR 7 above).

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
- **K4 — `track` takes the job's progress itself** (2026-11-09): in place of
  a separate `progress(p)`, a job is a promise or a function that gets an
  `onProgress` callback (Case Constructor's shape): with two jobs under one
  bar, a report always belongs to its own job. `JobProgress` is in
  `core/progress` (ui and worker both use it, and may not import each
  other); its `label` is a `Message`. Once the bar is up, the jobs still
  running under it keep it up, whatever their delay.
- **K4 — our own dialog, not `<dialog>`** (2026-11-09): `.modal` and
  `.modal-box` as Plate Builder has them; Esc in the capture phase on the
  window, so the app's shortcuts never see it; Tab kept inside. jsdom lists
  a selector list's matches selector by selector, so the focusable elements
  are sorted into the document's order.
- **K4 — small additions** (2026-11-09): `kit.preset.open`; a user preset's
  row has ↗ to open it (its name is a field); `bindHistory` also has
  `dispose()`; `isTextEntry` does not count contenteditable (no app uses
  it, jsdom does not know it); `renderPresetList` draws nothing for the same
  list, so a name being typed keeps its focus.
- **K5 — `moduleWorker(create)`, not `moduleWorker(url)`** (2026-11-09): Vite
  finds and bundles a worker only by `new Worker(new URL('./x.worker.ts',
  import.meta.url), { type: 'module' })` in the app's own code, so the app
  passes a function that makes it.
- **K5 — `serveJobs({ isJob, handle, scope?, now? })`** (2026-11-09): the
  worker checks what came through `postMessage` with the app's guard; the
  scope and the clock are parameters for tests. `WorkerClient` also has
  `dispose()`. Progress labels are `Message`s; an app maps their codes to
  its keys when it hands them to the bar.
- **K5 — the viewer** (2026-11-09): parts take an `IndexedMesh` (normals are
  creased anew); the model stands on the bed, centred, and `model` moves with
  it, so an app's own objects stay in place; `recolor()` reads the colour
  tokens again after an accent change; the camera fits the part of the view
  the sheet leaves free, with room around the model (1.7 × its bounding
  sphere; Plate Builder had 1.1 and the model filled the view). Camera
  presets are the kit's frame: `top`, `front`, `side`, `bottom`, `iso`;
  Plate Builder's "front" of a flat plate is the kit's `top`.
- **K5 — `assessExport` returns `{ blockers, warnings }`** (Cast Builder's
  names were `blocking`); Case Constructor's largest-part check stays in the
  app (one app needs it). `boxMesh` is in `3d/mesh`: the showcase's model,
  the tests' solid.
- **K6 — steps and the run in the harness** (2026-11-09): all three apps and
  the kit wrote the same `step(name, fn)` and the same try / catch / finally
  around their steps: `app.step` and `app.run(body, done)` do it (a step
  prints its time, as Cast Builder's did). `createSteps` is that part apart
  from the browser, for the unit tests.
- **K6 — helpers** (2026-11-09): `download(page, selector)` gives
  `{ name, bytes, path }` (the apps wrote `Promise.all([waitForEvent,
  click])` five times); `binaryStl(bytes)` checks an STL's size against its
  count; `settled(page)` (the kit's and Plate Builder's wait for the sheet);
  `throttle(page, rate)` is a function, not a method of Case Constructor's
  one-page app; `parseArgs` takes Case Constructor's repeatable flags.
- **K6 — the offline check stays in the apps** (2026-11-09): Plate Builder
  and Cast Builder both do it, but the showcase has no service worker, so
  the kit could not test a helper for it. It can come with K7 if the
  showcase gets one.
- **K6 — the harness is tested** (2026-11-09): `scripts/harness.test.ts`
  (vitest, node) covers the flags, the STL check and the run; the showcase's
  smoke uses every helper and checks that throttling slows the page;
  `consumer/` imports `maker-kit/harness` with its types.
- **M1 — the dev server skips the kit in pre-bundling** (2026-11-10): Vite's
  dependency optimizer read the kit's TypeScript as JavaScript and the dev
  server died (Plate Builder's worker importing `maker-kit/3d/mesh`); K0's
  consumer ran only `vite build`. Apps set `optimizeDeps: { exclude:
  ['maker-kit'] }`; `npm run consumer` now loads the consumer's page on a
  dev server in Chromium (CI installs Chromium before it). `v0.3.1`.
- **M1 — `parseArgs` overloads** (2026-11-10): without repeatable flags its
  values are `string`; a type-aware lint of an app's script tripped on
  `string | string[]` in template literals.
- **M1 — what Plate Builder shows differently** (2026-11-10), beyond −/+
  held: the kit's presets dialog (its user presets first, groups, ↗ open,
  two-tap delete), the storage banner under the top bar in the kit's words
  (blocked in red, full in the warn colour; its save button gone), the
  export gate's sentences (`kit.mesh.*`), the 3D view's 1.7 × fit and
  token colours, the check row's 18 px box, a foreign file "not a project
  of this app", and the kit's density (16 px text and 40 px controls on a
  phone, 14 px and 28 px on a desktop): the user's call, 2026-11-10; its
  own pieces follow the kit's tokens. Built-in preset names moved into the
  dictionaries (`preset.<id>.name`); a preset's state keeps its English
  project name, as before.
- **M1 — stacked PRs** (2026-11-10): one PR per group, each based on the
  previous branch. GitHub moves a stacked PR to `main` only when its base
  branch is deleted; `m1-core` stayed after its merge, so #17–#19 merged
  into it and a PR of `m1-core` carried them on. M2 and M3: each group's PR
  waits for the previous one to be merged into `main` and is then based on
  `main`, or the base branch is deleted at once after its merge.
- **M2 — the language is no undo step** (2026-11-10): Cast Builder kept
  the language inside its `Settings`; undo goes over the settings and the
  setup, so the language left `Settings` and is stored beside them, in the
  same place of the record as before (no new version).
- **M2 — opening a model resets the history** (2026-11-10): until 📄 New
  puts the model in the state by reference, the steps belong to the old
  model's setup and would turn the new one. A tab, a turn, Reset and Find
  are a step each. Gone with 📄 New (cast-builder #17): opening a model is
  one step.
- **M2 — no storage banner in Cast Builder** (2026-11-10): the kit's
  sentences send the person to "save the project to a file with ⬇️", which
  Cast Builder has not got. It keeps its "model too large to keep" note.
  The banner's words should say what to do without a project file before a
  third app takes it (K7).
- **M2 — one lane, kept jobs** (2026-11-10): Cast Builder's queue is
  `WorkerClient` with one lane, an export and Find kept. The kit lets a
  fresher kept job replace a waiting one (an export clicked while a Find
  waits drops the Find); Cast Builder's own client dropped the newer one.
  Both are silent; the buttons guard against the case.
- **M2 — the worker takes any object** (2026-11-10): `serveJobs` drops
  what `isJob` refuses, and the client then waits forever. Cast Builder
  passes any object and lets its sanitizer answer a broken job with an
  error. A kit option to answer a refused job may come with K7.
- **M2 — what Cast Builder shows differently** (2026-11-10), beyond the
  plan's list (the exact field, undo and redo, the palette, the view's
  bar): the panel beside the view from 1024 px (was 761 px), the kit's
  density, a two-line top bar on a phone (the brand and 🌐, then Open STL
  and ↶ ↷), −/+ with a 400 ms pause before the repeat, the kit's viewer
  (its light, the iso camera, 1.7 × fit, frames on demand; the tooling
  keeps its plaster grey, the grid at least a 200 mm bed), and the export
  gate's sentences (`kit.mesh.*`).
- **M2 — the model by reference** (2026-11-10): Cast Builder's `Project`
  holds a `ModelRef` whose `toJSON()` is its id, not an id beside a map of
  meshes: the history's JSON comparison sees the id, the mesh is shared,
  and it is freed with the last step that holds it — no pruning, no change
  to `History`. 📄 New is the app's own button (no presets in Cast Builder):
  no model, the setup at its defaults, the settings kept; disabled with no
  model; on a phone it closes the sheet over the invitation. Opening a model
  is a step from the default setup; a model brought back by undo is stored
  again.
- **K7a — a refused job's answer is a sentence, not a code** (2026-11-10):
  every error from a worker is a plain English message today (an
  exception's, the client's "the worker reply is unreadable"), shown inside
  the app's own "could not build: {error}". `kit.worker.badJob` would be the
  only translated one: the answer is "the job is not one this worker takes".
- **K7a — `threadHole` and `ThreadDetail`** (2026-11-10): Case Constructor's
  `threadHole` came too — a screw goes in tip down, and an asymmetric form
  meets its own flanks only with the hole turned over; its test proves it.
  Points and slices per turn are one `{ points, slicesPerTurn }`: Case
  Constructor slices once per point, Cast Builder 16 times per turn against
  48 points.
- **K7a — `csg` takes `3d` but its viewer** (2026-11-10), not only
  `3d/mesh`: `stl` and `validate` are as pure. oxlint's regex has no
  lookahead, so the rule names the viewer.
- **K7a — the consumer serves the kit's `node_modules`** (2026-11-10): it has
  no install of its own, so its `manifold-3d` is the kit's, out of the dev
  server's root, and the `.wasm` is fetched as a file: `server.fs.allow`
  `['..']` in `consumer/vite.config.ts`. An app's manifold is in its own
  `node_modules`.
- **K7b — no `groupCount`** (2026-11-10): "2 / 10" is a template literal;
  what the kit owes it is CSS — `.group-count` isolated left to right, or
  Hebrew read "10 / 2" (the showcase's screenshot caught it).
- **K7b — `renderItemList` returns nothing** (2026-11-10): the plan's
  `syncHints` is the render itself — called with the same rows it updates
  the hints in place and leaves the rest. A body left out of every new row
  stays detached: the app keeps its node, no parking (Plate Builder parked
  its controls in the panel).
- **K7b — two advice keys and a `code` per message** (2026-11-10): the kit's
  advice is `kit.storage.advice.file` and `.fileFull` (the full storage's
  advice adds "delete presets"); fact and advice joined by a space read as
  the old sentence in all four languages, a test holds it for English.
  `MessageLine.code` becomes `data-code`: Plate Builder's smoke finds its
  warnings by it, Cast Builder's messages are codes too.
- **K7c — `offline` gives the page back** (2026-11-10): open, wait for the
  service worker, reload, go offline, reload, then the app's `ready(page)`;
  the page stays offline for the app's own checks (Cast Builder builds its
  sample from the cached worker and WASM) and the caller closes it. The
  showcase's service worker is the template's `sw-plugin.ts` and `pwa.ts`,
  copied as every app copies them.
- **Plate Builder on v0.4.0** (2026-11-11, plate-builder PR #23): the row
  ids' prefix is the group's type (`text_t1`, `hole_h1_remove`); the app
  keeps no redraw key of its own (the kit's lists skip an unchanged
  drawing) and parks its controls node only when a redraw left it
  detached. It found that `outerOutline` threw a TypeError on an empty
  section (manifold makes no section of no polygons): `v0.4.1` gives an
  empty one; Plate Builder's `fillHoles` keeps its `null` for it.
- **Cast Builder on v0.4.1** (2026-11-12, cast-builder PR #18): its guard
  is `isRawJob` (an object whose model is a valid mesh) and `sanitizeJob`
  brings the rest of a taken job to a valid one, so a job the guard takes
  always becomes one. Its messages list a failed job's error first; a
  failed build shows that line alone (the last build's warnings went with
  its parts). The banner is drawn from the project's write only: the model
  that does not fit keeps its own note in the Model card.
- **C1 — the recipe was run, not only written** (2026-11-12): the steps of
  `_conventions/3d-tools.md` were applied to a fresh copy of the template
  (a cube with a hole built by a worker on `csg/manifold`, the kit's layout,
  panel, sheet, picker and bar, an STL download) and passed its check, the
  dev and the preview smoke (offline with the worker and the WASM, a new
  deploy reaching an open page), and the main-chunk grep. It found the
  skill's rename list missing `src/sw-plugin.test.ts` (the manifest's name);
  the skill now lists it. The kit's docs are not in the package, so the
  recipe points at `~/projects/maker-kit/docs/`. `_conventions/` and
  `~/projects/CLAUDE.md` are not under git: C1 has no PR of its own.
