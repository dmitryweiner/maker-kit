# ui — the page's pieces, no three

## ui/controls — the panel

```ts
const handle = renderControls(container, controls, {
  read: () => history.state,
  change: (next, final) => (final ? history.commit(next) : history.live(next)),
  idPrefix: 'plate',
  t,                       // Translate<AppKey>; AppKey includes the kit's keys
  timers,                  // optional: fake ones in tests
});
handle.sync(state);        // after any change from elsewhere (undo, a preset)
```

A row is data: how to read its value and how to write it.

| kind | value | notes |
|---|---|---|
| `range` | number | `min`/`max` may depend on the state; `step`; `unit`; `values: { list, suffix }` — buttons under the slider |
| `select` | string | `options` may depend on the state; refilled only when they change |
| `segmented` | string | a group of buttons, the current one pressed |
| `toggles` | string[] | any number pressed |
| `check` | boolean | |
| `text` | string | `maxLength`, `placeholder` |
| `textarea` | string | `rows`, `maxLength` |
| `button` | — | `button` caption, `apply(state)` |

Every kind takes `label` (a key or `{ text }`), `hint` (tooltip), `note`
(`{ key, params, when }`: a line under the row), `when` (hidden when it
does nothing) and `disabled` (shown, greyed); choices take
`optionDisabled(state, value)`.

**`final`** — one undo step per final change:

- slider: live while dragged, final on release (`change`);
- exact field, select, check, segmented, toggles, value buttons, button: final;
- text, textarea: live while typing, final when left (`change`: blur, Enter);
- −/+ (`ui/stepper`): a press is a live step, held past 400 ms it repeats
  every 150 ms, the release is the final change — a click and a whole hold
  are one undo step each.

**Behaviour**

- The range row: `label | − slider + | exact field | unit`. Decimals from
  the step, trailing zeros dropped. The field takes a typed value, clamps
  it, and puts the current one back on garbage.
- −/+ step on the step's grid and clamp, are disabled at the limits, are
  named "Decrease Width" (`kit.control.decrease`), and are out of the tab
  order: the slider and the field are in it. A press does not take the
  focus, so Ctrl+Z after it undoes it.
- A text field is never rewritten while it has focus (the caret would jump).
- Value buttons are a sibling of the row: a click on their gaps never
  reaches the slider.
- `when` hides the row with its note and value buttons by the `hidden`
  attribute: the app's CSS must never let a `display` rule beat `[hidden]`.

**Ids** (smoke scripts use them): `<prefix>_<key>` the input; `_n` the exact
field; `_dec` / `_inc`; `_v<value>` a value button; `_<value>` a segment or
toggle; `_note`; `_label` the name of a segmented or toggles group.

**Classes** (styled by `kit.css`): `row` with `range-row`, `check-row`,
`text-row`, `segmented-row`; `row-name`, `row-note`, `adj-btn`, `exact`,
`unit`, `values`, `value-btn`, `segmented`, `seg-btn` (`active`),
`row-btn`; `disabled` on a greyed row.

## ui/stepper — repeat while held

`holdToRepeat(button, { step, end, timers?, delayMs = 400, repeatMs = 150 })`:
`step` at the press and on every repeat, `end` once at the release
(pointerup, cancel, leave, lost capture). A click from the keyboard or a
screen reader (`detail` 0) is a step and an end.

## ui/card — folding cards

```ts
const card = createCard(panel, { id: 'lid', title: 'card.lid', tag: { text: 'M3' }, desc: 'card.lid.desc', enabled: state.lid.on, t });
renderControls(card.body, lidControls, o);
card.setEnabled(state.lid.on);   // after every change: unfolds when it turns on, never folds
const folded = snapshotCards(panel);  /* re-render */  restoreCards(panel, folded);
```

`#card_<id>` with a head button (`aria-expanded`, `aria-controls`) and
`#card_<id>_body`.

## ui/sheet — the panel as a bottom sheet on a phone

```ts
const sheet = setupSheet({ panel, button: settings, close: handle, view: canvasWrap,
  narrow: matchMedia('(max-width: 1023px)'), open: false, onInset: (px) => viewer.setInset(px), onChange });
```

Opened by the ⚙ button, closed by the handle or a tap on the view (one
finger, < 300 ms, < 6 px); drags and pinches pass to the view. `onInset`
says how much of the view it covers; `refresh()` after a resize. On a wide
screen it does nothing.

## ui/progress — the bar over the view

```ts
const progress = createProgress(viewProgress, { t });
progress.track(client.run(job));                                         // a preview: after 300 ms, no text
progress.track((onProgress) => client.run(job, (p) => onProgress(stage(p))), { label: 'export.stl', delayMs: 0 });   // an export
progress.refresh();   // after a language switch

/** A worker's stage codes are strings: the app keeps those that are its keys. */
const stage = (p: JobProgress): JobProgress<Key> =>
  p.label && isKey(p.label.code) ? { ...p, label: { code: p.label.code, params: p.label.params } } : { step: p.step, total: p.total };
```

One bar for any number of jobs: up while any runs (once up, the jobs under
it keep it up), down when the last ends, never blinking between two in a
row. A running stripe, or the share done when the job reports
`{ step, total }`; a labelled job shows its stage (`label: Message`). The
track is `role="progressbar"`, named by the label or "Building…".

## ui/banner — what storage failed to keep

```ts
renderBanner(banner, { project: saveResult, preset: failedPresetAction }, { t, onDismiss });
```

The project's failure stays while it lasts; a preset's can be dismissed.
Red (`.bad`) when nothing is kept, the warn colour when the storage is full.

## ui/modal — one dialog at a time

```ts
const dialog = createModal(document.getElementById('presets'), { close: presetsClose });
dialog.open(presetsButton);   // the focus goes in; on close back to the button
modalOpen();                  // the app's shortcuts wait while true
```

Esc (taken before the app's keys) and the backdrop close it; Tab stays
inside; opening another closes the first. Markup: `.modal[hidden] > .modal-box`.

## ui/presetList — the presets dialog's list

```ts
renderPresetList(list, { builtIn: [{ id, label, note }], user: [{ id, name }], current, status, t, open, rename, remove });
```

The user's presets first (a name field renamed on change, ↗ open, 🗑 then
"Delete?" for 3 s), then the built-in ones; the open one is current and
"changed" once the project differs. Called with the same list, it draws
nothing, so a name being typed keeps its focus.

## ui/historyKeys — ↶ ↷ and Ctrl/⌘+Z, Shift+Ctrl/⌘+Z, Ctrl/⌘+Y

```ts
const keys = bindHistory({ undo, redo, onUndo, onRedo, canUndo, canRedo });
keys.refresh();   // after every change
```

Works on any layout (`shortcutLetter`: Cyrillic я, Hebrew ז → z) and right
after a slider, a check box or a select; a field with typed text
(`isTextEntry`) keeps its own undo; nothing while a dialog is open.

## ui/languagePicker — 🌐

`createLanguagePicker(topbar, { locales, current, names?, t, onChange })`
appends `label.lang-field` (🌐 and the languages by their own names);
`set(locale)` after a switch.

## ui/dom, ui/timers, ui/files

- `el(id, HTMLButtonElement)` — the element, typed, or a throw;
  `make('p', 'row-note', text)`.
- `Timers` (`set`, `clear`) and `browserTimers`.
- `download(name, textOrBytes, type)`; `pickFile(accept)` — the chosen
  file or null.
