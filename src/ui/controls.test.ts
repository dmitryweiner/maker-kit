// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { format } from '../core/format';
import type { Translate } from '../core/message';
import { kitEn, kitRu } from '../i18n/index';
import { renderControls, type Control } from './controls';

const en = {
  ...kitEn,
  outline: 'Outline',
  width: 'Width',
  points: 'Points',
  rect: 'Rectangle',
  star: 'Star',
  mm: 'mm',
  note: 'Note',
  walls: 'Walls',
  front: 'Front',
  back: 'Back',
  mode: 'Mode',
  remove: 'Remove',
  name: 'Name',
  typeName: 'Type a name',
  screws: '{n} {n|screw|screws} M3',
  spin: 'Spin',
  spinHint: 'Turns the model about its axis',
};
type Key = keyof typeof en;
const ru: Record<Key, string> = {
  ...kitRu,
  outline: 'Контур',
  width: 'Ширина',
  points: 'Лучи',
  rect: 'Прямоугольник',
  star: 'Звезда',
  mm: 'мм',
  note: 'Заметка',
  walls: 'Стенки',
  front: 'Перед',
  back: 'Зад',
  mode: 'Режим',
  remove: 'Убрать',
  name: 'Имя',
  typeName: 'Введите имя',
  screws: '{n} {n|винт|винта|винтов} M3',
  spin: 'Поворот',
  spinHint: 'Поворачивает модель вокруг оси',
};
const dicts = { en, ru };

interface Demo {
  kind: string;
  size: number;
  on: boolean;
  note: string;
  walls: string[];
  mode: string;
  name: string;
  spin: number;
  locked: boolean;
}

const fresh = (): Demo => ({
  kind: 'a',
  size: 50,
  on: false,
  note: 'hi',
  walls: ['front'],
  mode: 'x',
  name: 'Box',
  spin: 0,
  locked: false,
});

const controls: Control<Demo, Key>[] = [
  {
    kind: 'select',
    key: 'kind',
    label: 'outline',
    options: [
      { value: 'a', label: 'rect' },
      { value: 'b', label: 'star' },
    ],
    get: (s) => s.kind,
    set: (s, kind) => ({ ...s, kind }),
  },
  {
    kind: 'range',
    key: 'size',
    label: 'width',
    min: 10,
    max: (s) => (s.on ? 300 : 100),
    step: 0.5,
    unit: 'mm',
    disabled: (s) => s.locked,
    get: (s) => s.size,
    set: (s, size) => ({ ...s, size }),
  },
  {
    kind: 'check',
    key: 'on',
    label: 'points',
    when: (s) => s.kind === 'b',
    note: { key: 'screws', params: { n: 4 } },
    get: (s) => s.on,
    set: (s, on) => ({ ...s, on }),
  },
  { kind: 'textarea', key: 'note', label: 'note', rows: 2, maxLength: 20, get: (s) => s.note, set: (s, note) => ({ ...s, note }) },
  { kind: 'select', key: 'font', label: { text: 'Font' }, options: [{ value: 'x', text: 'Marck Script' }], get: () => 'x', set: (s) => s },
];

let state: Demo;
let changes: { next: Demo; final: boolean }[];

function render(list: readonly Control<Demo, Key>[] = controls, locale: 'en' | 'ru' = 'en') {
  const container = document.createElement('div');
  document.body.append(container);
  const t: Translate<Key> = (key, params) => format(dicts[locale][key], params, locale);
  const handle = renderControls(container, list, {
    read: () => state,
    change: (next, final) => {
      state = next;
      changes.push({ next, final });
    },
    idPrefix: 'demo',
    t,
  });
  return { container, handle };
}

function node<T extends Element>(id: string, ctor: abstract new () => T): T {
  const found = document.getElementById(id);
  if (!(found instanceof ctor)) throw new Error(`#${id}`);
  return found;
}
const input = (id: string) => node(id, HTMLInputElement);
const button = (id: string) => node(id, HTMLButtonElement);
const steps = () => changes.map((c) => [c.next.size, c.final]);

beforeEach(() => {
  document.body.innerHTML = '';
  state = fresh();
  changes = [];
});

describe('rows and labels', () => {
  it('labels every row in the given language and translates the options', () => {
    const { container } = render(controls, 'ru');
    expect([...container.querySelectorAll('.row-name')].map((n) => n.textContent)).toEqual(['Контур', 'Ширина', 'Лучи', 'Заметка', 'Font']);
    expect([...container.querySelectorAll('option')].map((o) => o.textContent)).toEqual(['Прямоугольник', 'Звезда', 'Marck Script']);
    expect(container.querySelector('.unit')?.textContent).toBe('мм');
  });

  it('ties each label to its input', () => {
    const { container } = render();
    const label = container.querySelector('label.row-name');
    expect(label instanceof HTMLLabelElement && label.htmlFor).toBe('demo_kind');
  });

  it('puts a hint on the label as a tooltip', () => {
    render([{ kind: 'check', key: 'on', label: 'points', hint: 'spinHint', get: (s) => s.on, set: (s, on) => ({ ...s, on }) }]);
    expect(document.querySelector('.row-name')?.getAttribute('title')).toBe('Turns the model about its axis');
  });

  it('draws again in another language on a re-render, as a language switch does', () => {
    const { container } = render();
    renderControls(container, controls, {
      read: () => state,
      change: () => {},
      idPrefix: 'demo',
      t: (key, params) => format(ru[key], params, 'ru'),
    });
    expect(container.querySelectorAll('.row')).toHaveLength(5);
    expect(container.querySelector('.row-name')?.textContent).toBe('Контур');
  });
});

describe('range', () => {
  it('shows a slider and an exact number, both with the limits of the state', () => {
    render();
    expect([input('demo_size').value, input('demo_size_n').value]).toEqual(['50', '50']);
    expect([input('demo_size').min, input('demo_size').max, input('demo_size_n').max]).toEqual(['10', '100', '100']);
    expect(input('demo_size_n').getAttribute('aria-label')).toBe('Width');
  });

  it('shows as many decimals as the step has, trailing zeros dropped', () => {
    state = { ...state, size: 12.345 };
    render([
      { kind: 'range', key: 'size', label: 'width', min: 0, max: 100, step: 0.05, get: (s) => s.size, set: (s, size) => ({ ...s, size }) },
    ]);
    expect(input('demo_size_n').value).toBe('12.35');
  });

  it('reports a slider drag as it goes and once more when it ends', () => {
    render();
    const slider = input('demo_size');
    slider.value = '60';
    slider.dispatchEvent(new Event('input'));
    slider.value = '70';
    slider.dispatchEvent(new Event('input'));
    slider.dispatchEvent(new Event('change'));
    expect(steps()).toEqual([
      [60, false],
      [70, false],
      [70, true],
    ]);
    expect(input('demo_size_n').value).toBe('70');
  });

  it('takes a typed number on change, clamped to the limits; garbage puts the value back', () => {
    render();
    const field = input('demo_size_n');
    field.value = '1000';
    field.dispatchEvent(new Event('change'));
    expect(state.size).toBe(100);
    expect(changes.at(-1)?.final).toBe(true);
    field.value = 'abc';
    field.dispatchEvent(new Event('change'));
    field.value = '  ';
    field.dispatchEvent(new Event('change'));
    expect([state.size, field.value, changes.length]).toEqual([100, '100', 1]);
  });

  it('names − and + after their row, keeps them out of the tab order', () => {
    render(controls, 'ru');
    expect([button('demo_size_dec').getAttribute('aria-label'), button('demo_size_inc').getAttribute('aria-label')]).toEqual([
      'Уменьшить: Ширина',
      'Увеличить: Ширина',
    ]);
    expect([button('demo_size_dec').type, button('demo_size_dec').tabIndex]).toEqual(['button', -1]);
  });

  it('draws value buttons under the slider, outside its row, the current one pressed', () => {
    const spin: Control<Demo, Key> = {
      kind: 'range',
      key: 'spin',
      label: 'spin',
      min: 0,
      max: 359,
      step: 1,
      values: { list: [0, 90, 180, 270], suffix: '°' },
      get: (s) => s.spin,
      set: (s, value) => ({ ...s, spin: value }),
    };
    const { container, handle } = render([spin]);
    const values = container.querySelector('.values');
    expect(values?.closest('.row')).toBeNull();
    expect([...container.querySelectorAll('.value-btn')].map((b) => [b.textContent, b.getAttribute('aria-pressed')])).toEqual([
      ['0°', 'true'],
      ['90°', 'false'],
      ['180°', 'false'],
      ['270°', 'false'],
    ]);
    button('demo_spin_v180').click();
    expect(changes).toEqual([{ next: { ...fresh(), spin: 180 }, final: true }]);
    state = { ...state, spin: 45 };
    handle.sync(state);
    expect([...container.querySelectorAll('.value-btn[aria-pressed="true"]')]).toEqual([]);
  });
});

const pointer = (type: string) => new PointerEvent(type, { bubbles: true, cancelable: true, button: 0 });
const press = (b: HTMLButtonElement) => {
  b.dispatchEvent(pointer('pointerdown'));
  b.dispatchEvent(pointer('pointerup'));
  b.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
};

describe('− and +', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('step on the step’s grid, a click one live change and one final, stopping at the limits', () => {
    render();
    press(button('demo_size_inc'));
    press(button('demo_size_inc'));
    press(button('demo_size_dec'));
    expect(steps()).toEqual([
      [50.5, false],
      [50.5, true],
      [51, false],
      [51, true],
      [50.5, false],
      [50.5, true],
    ]);
    expect([input('demo_size').value, input('demo_size_n').value]).toEqual(['50.5', '50.5']);
    state = { ...state, size: 50.3 };
    press(button('demo_size_inc'));
    expect(state.size).toBe(51);
    state = { ...state, size: 99.8 };
    press(button('demo_size_inc'));
    expect(state.size).toBe(100);
    expect([button('demo_size_inc').disabled, button('demo_size_dec').disabled]).toEqual([true, false]);
  });

  it('repeat while held with live changes, and give one final change at release', () => {
    vi.useFakeTimers();
    render();
    const plus = button('demo_size_inc');
    plus.dispatchEvent(pointer('pointerdown'));
    vi.advanceTimersByTime(400 + 150 * 3);
    plus.dispatchEvent(pointer('pointerup'));
    expect(steps()).toEqual([
      [50.5, false],
      [51, false],
      [51.5, false],
      [52, false],
      [52.5, false],
      [52.5, true],
    ]);
  });

  it('step once from the keyboard or a screen reader', () => {
    render();
    button('demo_size_inc').click();
    expect(steps()).toEqual([
      [50.5, false],
      [50.5, true],
    ]);
  });
});

describe('when and disabled', () => {
  it('hide a row that does nothing in this state, with its note, and sync it back', () => {
    const { container, handle } = render();
    const row = input('demo_on').closest('.row');
    const note = document.getElementById('demo_on_note');
    expect([row instanceof HTMLElement && row.hidden, note?.hidden]).toEqual([true, true]);
    const select = container.querySelector('select');
    if (!select) throw new Error('no select');
    select.value = 'b';
    select.dispatchEvent(new Event('change'));
    handle.sync(state);
    expect([row instanceof HTMLElement && row.hidden, note?.hidden]).toEqual([false, false]);
    expect(input('demo_size').max).toBe('100');
    input('demo_on').click();
    handle.sync(state);
    expect(state.on).toBe(true);
    expect(input('demo_size').max).toBe('300');
  });

  it('grey a row that is shown but not editable', () => {
    const { handle } = render();
    state = { ...state, locked: true };
    handle.sync(state);
    const row = input('demo_size').closest('.row');
    expect(row?.classList.contains('disabled')).toBe(true);
    expect([
      input('demo_size').disabled,
      input('demo_size_n').disabled,
      button('demo_size_inc').disabled,
      button('demo_size_dec').disabled,
    ]).toEqual([true, true, true, true]);
    state = { ...state, locked: false };
    handle.sync(state);
    expect([row?.classList.contains('disabled'), input('demo_size').disabled, button('demo_size_inc').disabled]).toEqual([
      false,
      false,
      false,
    ]);
  });
});

describe('note', () => {
  it('is a line under the row in the given language, hidden when its own condition says', () => {
    const noted: Control<Demo, Key> = {
      kind: 'check',
      key: 'on',
      label: 'points',
      note: { key: 'screws', params: { n: 3 }, when: (s) => s.on },
      get: (s) => s.on,
      set: (s, on) => ({ ...s, on }),
    };
    const { handle } = render([noted], 'ru');
    const note = document.getElementById('demo_on_note');
    expect([note?.textContent, note?.hidden]).toEqual(['3 винта M3', true]);
    state = { ...state, on: true };
    handle.sync(state);
    expect(note?.hidden).toBe(false);
  });
});

describe('textarea and text', () => {
  it('a textarea reports typing as it goes and once more when the field is left', () => {
    render();
    const area = node('demo_note', HTMLTextAreaElement);
    expect([area.value, area.maxLength, area.rows, area.dir]).toEqual(['hi', 20, 2, 'auto']);
    area.value = 'hi\nthere';
    area.dispatchEvent(new Event('input'));
    area.dispatchEvent(new Event('change'));
    expect(changes.map((c) => [c.next.note, c.final])).toEqual([
      ['hi\nthere', false],
      ['hi\nthere', true],
    ]);
  });

  it('a text line does the same, with its placeholder, and is never rewritten under the caret', () => {
    const text: Control<Demo, Key> = {
      kind: 'text',
      key: 'name',
      label: 'name',
      maxLength: 60,
      placeholder: 'typeName',
      get: (s) => s.name,
      set: (s, name) => ({ ...s, name }),
    };
    const { handle } = render([text]);
    const field = input('demo_name');
    expect([field.type, field.value, field.placeholder, field.maxLength, field.dir]).toEqual(['text', 'Box', 'Type a name', 60, 'auto']);
    field.focus();
    field.value = 'Box 2';
    field.dispatchEvent(new Event('input'));
    handle.sync({ ...state, name: 'Box 2 trimmed elsewhere' });
    expect(field.value).toBe('Box 2');
    field.dispatchEvent(new Event('change'));
    field.blur();
    handle.sync({ ...state, name: 'Lid' });
    expect(field.value).toBe('Lid');
    expect(changes.map((c) => [c.next.name, c.final])).toEqual([
      ['Box 2', false],
      ['Box 2', true],
    ]);
  });
});

describe('select', () => {
  it('rebuilds its options only when the state offers others, keeping the chosen one', () => {
    const offered: Control<Demo, Key> = {
      kind: 'select',
      key: 'pick',
      label: 'outline',
      options: (s) =>
        s.on
          ? [
              { value: 'a', label: 'rect' },
              { value: 'b', label: 'star' },
            ]
          : [{ value: 'a', label: 'rect' }],
      get: (s) => s.kind,
      set: (s, kind) => ({ ...s, kind }),
    };
    const { handle } = render([offered]);
    const select = node('demo_pick', HTMLSelectElement);
    const values = () => [...select.options].map((o) => o.value);
    expect(values()).toEqual(['a']);
    state = { ...state, on: true, kind: 'b' };
    handle.sync(state);
    expect(values()).toEqual(['a', 'b']);
    expect(select.value).toBe('b');
    expect(select.options[1]?.textContent).toBe('Star');
    // the same list again: the nodes stay, an open list does not close under the finger
    const first = select.options[0];
    handle.sync(state);
    expect(select.options[0]).toBe(first);
  });

  it('disables an option that cannot be chosen in this state', () => {
    render([
      {
        kind: 'select',
        key: 'kind',
        label: 'outline',
        options: [
          { value: 'a', label: 'rect' },
          { value: 'b', label: 'star' },
        ],
        optionDisabled: (s, value) => value === 'b' && !s.on,
        get: (s) => s.kind,
        set: (s, kind) => ({ ...s, kind }),
      },
    ]);
    const select = node('demo_kind', HTMLSelectElement);
    expect([...select.options].map((o) => o.disabled)).toEqual([false, true]);
    select.value = 'a';
    select.dispatchEvent(new Event('change'));
    expect(changes).toEqual([{ next: fresh(), final: true }]);
  });
});

describe('segmented and toggles', () => {
  const mode: Control<Demo, Key> = {
    kind: 'segmented',
    key: 'mode',
    label: 'mode',
    options: [
      { value: 'x', label: 'rect' },
      { value: 'y', label: 'star' },
      { value: 'z', text: 'USB-C' },
    ],
    optionDisabled: (s, value) => value === 'z' && !s.on,
    get: (s) => s.mode,
    set: (s, value) => ({ ...s, mode: value }),
  };
  const walls: Control<Demo, Key> = {
    kind: 'toggles',
    key: 'walls',
    label: 'walls',
    options: [
      { value: 'front', label: 'front' },
      { value: 'back', label: 'back' },
    ],
    get: (s) => s.walls,
    set: (s, value) => ({ ...s, walls: value }),
  };

  it('a segmented row presses the current option in a labelled group', () => {
    const { handle } = render([mode]);
    const group = node('demo_mode', HTMLElement);
    expect(group.getAttribute('role')).toBe('group');
    expect(document.getElementById(group.getAttribute('aria-labelledby') ?? '')?.textContent).toBe('Mode');
    const pressed = () => ['x', 'y', 'z'].map((v) => button(`demo_mode_${v}`).getAttribute('aria-pressed'));
    expect(pressed()).toEqual(['true', 'false', 'false']);
    expect(button('demo_mode_z').disabled).toBe(true);
    button('demo_mode_y').click();
    handle.sync(state);
    expect(pressed()).toEqual(['false', 'true', 'false']);
    expect(changes.map((c) => [c.next.mode, c.final])).toEqual([['y', true]]);
  });

  it('toggles press any number of options, a click adds or takes one', () => {
    const { handle } = render([walls]);
    button('demo_walls_back').click();
    handle.sync(state);
    expect(state.walls).toEqual(['front', 'back']);
    button('demo_walls_front').click();
    handle.sync(state);
    expect(state.walls).toEqual(['back']);
    expect(['front', 'back'].map((v) => button(`demo_walls_${v}`).getAttribute('aria-pressed'))).toEqual(['false', 'true']);
  });
});

describe('button', () => {
  it('applies its action to the state as one final change', () => {
    render([{ kind: 'button', key: 'reset', label: 'name', button: 'remove', apply: (s) => ({ ...s, name: '' }) }]);
    const action = button('demo_reset');
    expect(action.textContent).toBe('Remove');
    action.click();
    expect(changes).toEqual([{ next: { ...fresh(), name: '' }, final: true }]);
  });
});

describe('check', () => {
  it('reports a change as final', () => {
    state = { ...state, kind: 'b' };
    render();
    input('demo_on').click();
    expect(changes).toEqual([{ next: { ...fresh(), kind: 'b', on: true }, final: true }]);
  });
});
