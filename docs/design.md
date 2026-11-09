# Design code

The look and the behaviour every 3D tool on the kit shares. The CSS is
`src/styles/tokens.css` and `src/styles/kit.css`; the showcase
(`npm run dev`, or the kit's GitHub Pages) shows every piece in every state.
This page is what the CSS cannot say.

## Using it

```ts
import 'maker-kit/styles/kit.css';   // tokens included
```

```html
<html lang="en" dir="ltr" data-accent="emerald">
  <body class="kit-app">…</body>
</html>
```

- Everything is in `@layer kit`: any rule of the app wins with no
  specificity fight. Override a token in the app's own `:root`.
- Accents shipped: `cyan` (Case Constructor, the default), `emerald` (Plate
  Builder), `burgundy` (Cast Builder, with warmer neutrals). A new app picks
  one or sets `--accent`, `--accent-strong`, `--accent-soft`, `--on-accent`.
- Dark only. Colours come from tokens, never literals in an app's CSS, so a
  light theme can come later.
- App-specific colours (an editor canvas, the axes) stay in the app.

## Layout

```
┌ top bar ─────────────────────────────────────────────────────┐
│ brand  [project name …]  📄 💾 📂 ⬇️ ↶ ↷          🌐 language │
├ banner (only when storage fails) ───────────────────────────┤
│ panel (cards)   │ view                          chips (Iso…) │
│ 360 px, scrolls │                                            │
│                 │ ▬▬▬▬▬ progress                              │
│                 │ status                                     │
└─────────────────┴────────────────────────────────────────────┘
```

- **From 1024 px**: the panel beside the view, on the start side (left in
  English, right in Hebrew), 360 px, scrolling on its own; the page itself
  never scrolls.
- **A phone**: the view fills the screen; the panel is a bottom sheet over
  it (at most 62 % of the height), opened by the ⚙ Settings button centred
  at the bottom and closed by its handle or a tap on the view; drags and
  pinches on the view pass through to it.
- **Markup**: `.topbar`, then `.banner`, then `.workspace` holding `.view`
  and `.panel` in this order (the panel comes first on screen by
  `row-reverse`). Inside the view: the canvas, `.chips`, `.view-progress`,
  `.view-status`, `.sheet-open`.

## Top bar

- Order: the brand; the project's name, which opens the presets dialog
  (a `●` in the warn colour when the project differs from its preset); then
  the tools 📄 new, 💾 save as a preset, 📂 open a project file, ⬇️ save it to
  a file, ↶ undo, ↷ redo; then 🌐 the language.
- **On a phone, two lines**: the brand and the language, then the name and
  the six tools. Tools are 36 px with a 4 px gap, so the name keeps some room
  on a 360 px screen; from 760 px everything is one line, tools 40 px, gap
  6 px.
- Tools are icons; each has its name as `title` and `aria-label`
  (`kit.topbar.*`). Undo and redo are disabled when there is nothing to do
  (`ui/historyKeys`).
- The language picker is `ui/languagePicker`, appended at the end of
  `.topbar`; the CSS orders it.

## Cards

- A card is a group of rows with an uppercase muted title (`.card h2`).
- A foldable card (`.fcard`) has a head button: title, an optional tag
  (`M3`), a caret. It **unfolds when its feature turns on** and **never folds
  under the hand** — turning a feature off happens inside the open card.
  Folding survives a re-render (a language switch).

## The slider row

```
Width   [−] ━━━━●━━━━ [+] [ 60.5 ] mm
        └ 0°  90°  180°  270°        (value buttons, optional)
          4 screws M3 × 8            (note, optional)
```

- On a desktop the name has its own column (96 px); Russian and Ukrainian
  names wrap in it rather than squeeze the slider. On a phone the name is
  above the controls.
- The exact field takes a typed value and clamps it; garbage puts the
  current value back. Decimals follow the step; trailing zeros are dropped.
- −/+ step on the step's grid, are disabled at the limits, repeat while
  held. They are out of the tab order (the slider and the field are in it).
- A row that does nothing in this state is **hidden**; one computed
  elsewhere is **greyed** (`.disabled`) but shown.
- A hint is a tooltip on the name (dotted underline); a note is a line
  under the row, always in sight (sizes, what to buy).

## Numbers and units

- mm everywhere, written after the number with a space: `60 mm`; sizes
  `60 × 30 mm` with the multiplication sign; degrees with no space: `90°`.
- Units are dictionary keys (`мм`, `מ״מ`).
- A line mixing numbers and words in an RTL page keeps its order with
  `unicode-bidi: plaintext` (the view's status) or `dir="auto"` (text fields).

## The 3D view

The model in a warm white plastic over a grid of 1 cm cells, lit low from
one side; the background is `--bg`, the grid `--line` with its centre
lines towards `--muted`, so an accent with its own neutrals (burgundy)
tints the view too. Camera chips over the view's top end corner. The model
fits with room around it; on a phone, in the part the open sheet leaves
free. Without WebGL the app goes on without its view.

## Severity

| | colour | used for |
|---|---|---|
| bad | `--bad` | blocks the export: an open mesh, a broken file, storage that keeps nothing |
| warn | `--warn` | prints, but maybe not as meant: a part on a screw post; storage full |
| info | `--info` (the accent) | worth knowing: how many screws to buy |

Messages (`.messages > .message.bad|warn|info`) carry a bar of their colour
on the start side; their text stays in the text colour for reading.

## Actions

- **Destructive actions take two taps**: 🗑, then "Delete?" (`.danger`) for
  3 s. No `confirm()`.
- **No system dialogs** — no `alert`, `confirm`, `prompt`: they block the
  page and the smoke. One `.modal` at a time; Esc and the backdrop close it;
  the focus goes into it and back to its button.
- One primary button per card at most (`.btn.primary`: Download STL).
- A failed write to storage is shown in the banner, never swallowed
  (`kit.storage.*`): the project's failure stays while it lasts, a preset's
  can be dismissed.

## Progress

One bar over the view for any number of jobs. It appears after 300 ms of
work (a quick preview never flickers it) or at once for a job asked for
with a button (an export). A running stripe when nothing says how much is
done; the share done when the job reports steps. A label only for long
jobs. The previous result stays under it; it takes no pointer events. On a
phone it sits above the settings button, on a desktop above the status.

## Ids

One scheme, used by every app's smoke: `<prefix>_<key>` the input; `_n` a
range's exact field; `_dec` / `_inc`; `_v<value>` a value button; `_<value>`
a segment or toggle; `_note`; `_label` a group's name. A folding card is
`card_<id>`, its body `card_<id>_body`; a preset's row carries
`data-ref="b:<id>"` or `"u:<id>"`.

## RTL

`dir="rtl"` on `<html>` mirrors everything: the CSS has logical properties
only (`inline-start`, `block-end`, …). Sliders run from the start side; a
folded card's caret points to the end. Icons that mean a direction (↶ ↷)
are not mirrored: undo is undo.

## Density and touch targets

| | phone | desktop (≥ 1024 px) |
|---|---|---|
| text | 16 px | 14 px |
| controls, segments, fields | ≥ 40 px | 28 px |
| −/+ | 40 px | 22 px |
| tools in the top bar | 36 px (40 px from 760 px) | 40 px |

The whole line of a check box is its target. Everything is in tokens
(`--control-h`, `--stepper`, `--tool`, …).

## Hidden

`when` hides by the `hidden` attribute, and `kit.css` makes `[hidden]`
beat any `display`. An app's CSS must not undo that (`display: … !important`
on a class that may be hidden).
