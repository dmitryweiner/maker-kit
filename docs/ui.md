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

**Classes** (styled by `kit.css`, K3): `row` with `range-row`, `check-row`,
`text-row`, `segmented-row`; `row-name`, `row-note`, `adj-btn`, `exact`,
`unit`, `values`, `value-btn`, `segmented`, `seg-btn` (`active`),
`row-btn`; `disabled` on a greyed row.

## ui/stepper — repeat while held

`holdToRepeat(button, { step, end, timers?, delayMs = 400, repeatMs = 150 })`:
`step` at the press and on every repeat, `end` once at the release
(pointerup, cancel, leave, lost capture). A click from the keyboard or a
screen reader (`detail` 0) is a step and an end.

## ui/dom, ui/timers, ui/files

- `el(id, HTMLButtonElement)` — the element, typed, or a throw;
  `make('p', 'row-note', text)`.
- `Timers` (`set`, `clear`) and `browserTimers`.
- `download(name, textOrBytes, type)`; `pickFile(accept)` — the chosen
  file or null.
