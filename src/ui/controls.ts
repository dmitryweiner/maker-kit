// Declarative controls over any state: each row says how to read its value
// and how to write it; this module draws the rows, formats the numbers,
// keeps them in sync and reports changes. Every card of every app's panel is
// drawn by the same code (Plate Builder's API, with Case Constructor's and
// Cast Builder's kinds and details).
//
// Labels, hints and options are dictionary keys, not text: translation
// happens when drawn, and a change of language is drawing again.
//
// Ids, one scheme for every app (smoke scripts use them): `<prefix>_<key>`
// the input; `_n` a range's exact field; `_dec` / `_inc` its − and +;
// `_v<value>` its value buttons; `_<value>` a segment or toggle; `_note`.

import type { Label, Params, Translate } from '../core/message';
import { labelText } from '../core/message';
import type { KitKey } from '../i18n/index';
import { make } from './dom';
import { holdToRepeat } from './stepper';
import type { Timers } from './timers';

type When<T> = (state: T) => boolean;
/** A limit may depend on the state: the rounding on the plate's size. */
export type Limit<T> = number | ((state: T) => number);
/** A dictionary key, or a text shown as it is (a font's own name, a port id). */
export type Option<K extends string> = { value: string; label: K } | { value: string; text: string };
/** Options may depend on the state: the magnets' layouts on their count. */
export type Options<T, K extends string> = readonly Option<K>[] | ((state: T) => readonly Option<K>[]);

interface Common<T, K extends string> {
  key: string;
  label: Label<K>;
  /** a tooltip on the label */
  hint?: K;
  /** a line under the row, always in sight: sizes, what to buy; hidden with the row and when its own `when` says */
  note?: { key: K; params?: Params; when?: When<T> };
  /** hidden when it does nothing in this state */
  when?: When<T>;
  /** shown, not editable (a size computed elsewhere) */
  disabled?: When<T>;
}

export interface RangeControl<T, K extends string> extends Common<T, K> {
  kind: 'range';
  min: Limit<T>;
  max: Limit<T>;
  step: number;
  unit?: K;
  /** values a button away, under the slider: 0° 90° 180° 270° */
  values?: { list: readonly number[]; suffix?: string };
  get(state: T): number;
  set(state: T, value: number): T;
}

interface Choice<T, K extends string> extends Common<T, K> {
  options: Options<T, K>;
  /** an option that cannot be chosen in this state */
  optionDisabled?(state: T, value: string): boolean;
}

export interface SelectControl<T, K extends string> extends Choice<T, K> {
  kind: 'select';
  get(state: T): string;
  set(state: T, value: string): T;
}

/** A row of buttons, one per option, the current one pressed. */
export interface SegmentedControl<T, K extends string> extends Choice<T, K> {
  kind: 'segmented';
  get(state: T): string;
  set(state: T, value: string): T;
}

/** A row of buttons, any number of them pressed (the walls a board stands against). */
export interface TogglesControl<T, K extends string> extends Choice<T, K> {
  kind: 'toggles';
  get(state: T): readonly string[];
  set(state: T, values: string[]): T;
}

export interface CheckControl<T, K extends string> extends Common<T, K> {
  kind: 'check';
  get(state: T): boolean;
  set(state: T, value: boolean): T;
}

/** A line of text: live changes while typing, a final one when the field is left. */
export interface TextControl<T, K extends string> extends Common<T, K> {
  kind: 'text';
  maxLength: number;
  placeholder?: K;
  get(state: T): string;
  set(state: T, value: string): T;
}

export interface TextAreaControl<T, K extends string> extends Common<T, K> {
  kind: 'textarea';
  rows: number;
  maxLength: number;
  get(state: T): string;
  set(state: T, value: string): T;
}

/** An action over the state ("remove board"). */
export interface ButtonControl<T, K extends string> extends Common<T, K> {
  kind: 'button';
  /** the caption on the button */
  button: K;
  apply(state: T): T;
}

export type Control<T, K extends string> =
  | RangeControl<T, K>
  | SelectControl<T, K>
  | SegmentedControl<T, K>
  | TogglesControl<T, K>
  | CheckControl<T, K>
  | TextControl<T, K>
  | TextAreaControl<T, K>
  | ButtonControl<T, K>;

export interface ControlsOptions<T, K extends string> {
  read(): T;
  /** A new state. `final`: an edit is complete, one undo step; false while dragging, typing or holding −/+. */
  change(next: T, final: boolean): void;
  idPrefix: string;
  /** the app's translate function: its keys include the kit's (`{ ...kitEn, … }`) */
  t: Translate<NoInfer<K> | KitKey>;
  timers?: Timers;
}

export interface ControlsHandle<T> {
  /** updates the shown values without making the DOM again */
  sync(state: T): void;
}

const limit = <T>(value: Limit<T>, state: T): number => (typeof value === 'function' ? value(state) : value);
const optionsOf = <T, K extends string>(options: Options<T, K>, state: T): readonly Option<K>[] =>
  typeof options === 'function' ? options(state) : options;

/** As many decimals as the step has, trailing zeros dropped: 12.345 by 0.05 → "12.35", 50 by 0.5 → "50". */
export function formatValue(value: number, step: number): string {
  const decimals = (String(step).split('.')[1] ?? '').length;
  return String(Number(value.toFixed(decimals)));
}

/** The next value on the step's grid, so a value typed between steps lands on one, within the limits. */
function stepped(value: number, step: number, dir: -1 | 1, min: number, max: number): number {
  const moved = Number(formatValue((Math.round(value / step) + dir) * step, step));
  return Math.min(max, Math.max(min, moved));
}

/** What a row adds to the panel: its nodes and how each follows the state. */
interface Drawn<T> {
  /** the input, the field and the buttons a `disabled` row greys */
  inputs: (HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLButtonElement)[];
  /** nodes after the row that `when` hides with it (value buttons) */
  after: HTMLElement[];
  sync(state: T): void;
}

export function renderControls<T, K extends string>(
  container: HTMLElement,
  controls: readonly Control<T, K>[],
  o: ControlsOptions<T, K>,
): ControlsHandle<T> {
  container.textContent = '';
  const syncers: ((state: T) => void)[] = [];

  for (const control of controls) {
    const id = `${o.idPrefix}_${control.key}`;
    const row = make('div', 'row');
    const group = control.kind === 'segmented' || control.kind === 'toggles';
    const name = group ? make('span', 'row-name') : make('label', 'row-name');
    name.textContent = labelText(control.label, o.t);
    if (name instanceof HTMLLabelElement) name.htmlFor = id;
    else name.id = `${id}_label`;
    if (control.hint) name.title = o.t(control.hint);
    row.append(name);

    const drawn = draw(control, row, id, o);
    const nodes: HTMLElement[] = [row, ...drawn.after];
    let note: HTMLElement | null = null;
    if (control.note) {
      note = make('p', 'row-note', o.t(control.note.key, control.note.params));
      note.id = `${id}_note`;
      nodes.push(note);
    }
    container.append(...nodes);

    const { when, disabled } = control;
    const noteWhen = control.note?.when;
    syncers.push((state) => {
      drawn.sync(state);
      const shown = when ? when(state) : true;
      for (const node of nodes) node.hidden = !shown;
      if (note && noteWhen) note.hidden = !shown || !noteWhen(state);
      if (disabled) {
        const off = disabled(state);
        row.classList.toggle('disabled', off);
        // a row's own sync may disable an input (− at the limit): `disabled` adds to it
        if (off) for (const input of drawn.inputs) input.disabled = true;
      }
    });
  }

  const handle: ControlsHandle<T> = {
    sync(state) {
      for (const syncer of syncers) syncer(state);
    },
  };
  handle.sync(o.read());
  return handle;
}

function draw<T, K extends string>(control: Control<T, K>, row: HTMLElement, id: string, o: ControlsOptions<T, K>): Drawn<T> {
  switch (control.kind) {
    case 'range':
      return drawRange(control, row, id, o);
    case 'select':
      return drawSelect(control, row, id, o);
    case 'segmented':
    case 'toggles':
      return drawButtons(control, row, id, o);
    case 'check': {
      const box = make('input');
      box.type = 'checkbox';
      box.id = id;
      box.addEventListener('change', () => o.change(control.set(o.read(), box.checked), true));
      row.classList.add('check-row');
      row.prepend(box);
      return {
        inputs: [box],
        after: [],
        sync: (state) => {
          box.checked = control.get(state);
          box.disabled = false;
        },
      };
    }
    case 'text':
    case 'textarea': {
      const field = control.kind === 'text' ? make('input') : make('textarea');
      if (field instanceof HTMLInputElement) {
        field.type = 'text';
        field.spellcheck = false;
        field.dir = 'auto';
      } else if (control.kind === 'textarea') {
        field.rows = control.rows;
      }
      field.id = id;
      field.maxLength = control.maxLength;
      if (control.kind === 'text' && control.placeholder) field.placeholder = o.t(control.placeholder);
      field.addEventListener('input', () => o.change(control.set(o.read(), field.value), false));
      field.addEventListener('change', () => o.change(control.set(o.read(), field.value), true));
      row.classList.add('text-row');
      row.append(field);
      return {
        inputs: [field],
        after: [],
        sync: (state) => {
          const value = control.get(state);
          // while typing, the field is the truth: rewriting it would move the caret
          if (field.value !== value && document.activeElement !== field) field.value = value;
          field.disabled = false;
        },
      };
    }
    default: {
      // 'button'
      const button = make('button', 'row-btn', o.t(control.button));
      button.type = 'button';
      button.id = id;
      button.addEventListener('click', () => o.change(control.apply(o.read()), true));
      row.append(button);
      return {
        inputs: [button],
        after: [],
        sync: () => {
          button.disabled = false;
        },
      };
    }
  }
}

function drawRange<T, K extends string>(control: RangeControl<T, K>, row: HTMLElement, id: string, o: ControlsOptions<T, K>): Drawn<T> {
  const label = labelText(control.label, o.t);
  const slider = make('input');
  slider.type = 'range';
  slider.id = id;
  slider.step = String(control.step);
  const field = make('input', 'exact');
  field.type = 'number';
  field.id = `${id}_n`;
  field.step = String(control.step);
  field.inputMode = 'decimal';
  field.setAttribute('aria-label', label);

  const show = (state: T): void => {
    const min = limit(control.min, state);
    const max = limit(control.max, state);
    const current = control.get(state);
    slider.min = field.min = String(min);
    slider.max = field.max = String(max);
    slider.value = field.value = formatValue(current, control.step);
    slider.disabled = field.disabled = false;
    minus.disabled = current <= min;
    plus.disabled = current >= max;
  };

  const stepper = (dir: -1 | 1): HTMLButtonElement => {
    const button = make('button', 'adj-btn', dir < 0 ? '−' : '+');
    button.type = 'button';
    button.id = `${id}_${dir < 0 ? 'dec' : 'inc'}`;
    button.tabIndex = -1;
    button.setAttribute('aria-label', o.t(dir < 0 ? 'kit.control.decrease' : 'kit.control.increase', { label }));
    holdToRepeat(button, {
      step: () => {
        const state = o.read();
        const next = stepped(control.get(state), control.step, dir, limit(control.min, state), limit(control.max, state));
        o.change(control.set(state, next), false);
        show(o.read());
      },
      end: () => {
        o.change(o.read(), true);
        show(o.read());
      },
      timers: o.timers,
    });
    return button;
  };
  const minus = stepper(-1);
  const plus = stepper(1);

  slider.addEventListener('input', () => {
    field.value = formatValue(Number(slider.value), control.step);
    o.change(control.set(o.read(), Number(slider.value)), false);
  });
  slider.addEventListener('change', () => o.change(control.set(o.read(), Number(slider.value)), true));
  field.addEventListener('change', () => {
    const state = o.read();
    const typed = Number(field.value);
    if (field.value.trim() === '' || !Number.isFinite(typed)) {
      show(state);
      return;
    }
    o.change(control.set(state, Math.min(limit(control.max, state), Math.max(limit(control.min, state), typed))), true);
    show(o.read());
  });

  row.classList.add('range-row');
  row.append(minus, slider, plus, field);
  if (control.unit) row.append(make('span', 'unit', o.t(control.unit)));

  const after: HTMLElement[] = [];
  const syncs: ((state: T) => void)[] = [show];
  const { values } = control;
  if (values) {
    // a sibling of the row: a click on the gaps between the buttons must not reach the slider
    const line = make('div', 'values');
    const buttons = values.list.map((value) => {
      const button = make('button', 'value-btn', `${value}${values.suffix ?? ''}`);
      button.type = 'button';
      button.id = `${id}_v${value}`;
      button.addEventListener('click', () => o.change(control.set(o.read(), value), true));
      line.append(button);
      return { button, value };
    });
    after.push(line);
    syncs.push((state) => {
      const current = control.get(state);
      for (const { button, value } of buttons) button.setAttribute('aria-pressed', String(value === current));
    });
  }
  return { inputs: [slider, field, minus, plus], after, sync: (state) => syncs.forEach((sync) => sync(state)) };
}

function drawSelect<T, K extends string>(control: SelectControl<T, K>, row: HTMLElement, id: string, o: ControlsOptions<T, K>): Drawn<T> {
  const select = make('select');
  select.id = id;
  let shown = '';
  const fill = (list: readonly Option<K>[]): void => {
    // made again only when the list changes: an open list would close under the finger
    const values = JSON.stringify(list.map((option) => option.value));
    if (values === shown) return;
    shown = values;
    select.textContent = '';
    for (const option of list) {
      const node = make('option', undefined, 'text' in option ? option.text : o.t(option.label));
      node.value = option.value;
      select.append(node);
    }
  };
  select.addEventListener('change', () => o.change(control.set(o.read(), select.value), true));
  row.append(select);
  return {
    inputs: [select],
    after: [],
    sync: (state) => {
      fill(optionsOf(control.options, state));
      for (const node of select.options) node.disabled = control.optionDisabled?.(state, node.value) ?? false;
      select.value = control.get(state);
      select.disabled = false;
    },
  };
}

/** Segmented (one pressed) and toggles (any pressed): a group of buttons labelled by the row's name. */
function drawButtons<T, K extends string>(
  control: SegmentedControl<T, K> | TogglesControl<T, K>,
  row: HTMLElement,
  id: string,
  o: ControlsOptions<T, K>,
): Drawn<T> {
  const group = make('div', 'segmented');
  group.id = id;
  group.setAttribute('role', 'group');
  group.setAttribute('aria-labelledby', `${id}_label`);
  row.classList.add('segmented-row');
  row.append(group);
  let buttons: { button: HTMLButtonElement; value: string }[] = [];
  let shown = '';

  const click = (value: string): void => {
    const state = o.read();
    if (control.kind === 'segmented') {
      o.change(control.set(state, value), true);
      return;
    }
    const now = control.get(state);
    o.change(control.set(state, now.includes(value) ? now.filter((v) => v !== value) : [...now, value]), true);
  };
  const fill = (list: readonly Option<K>[]): void => {
    const values = JSON.stringify(list.map((option) => option.value));
    if (values === shown) return;
    shown = values;
    group.textContent = '';
    buttons = list.map((option) => {
      const button = make('button', 'seg-btn', 'text' in option ? option.text : o.t(option.label));
      button.type = 'button';
      button.id = `${id}_${option.value}`;
      button.addEventListener('click', () => click(option.value));
      group.append(button);
      return { button, value: option.value };
    });
  };

  const drawn: Drawn<T> = {
    inputs: [],
    after: [],
    sync: (state) => {
      fill(optionsOf(control.options, state));
      const pressed = control.kind === 'segmented' ? [control.get(state)] : control.get(state);
      for (const { button, value } of buttons) {
        const on = pressed.includes(value);
        button.classList.toggle('active', on);
        button.setAttribute('aria-pressed', String(on));
        button.disabled = control.optionDisabled?.(state, value) ?? false;
      }
      drawn.inputs = buttons.map((b) => b.button);
    },
  };
  return drawn;
}
