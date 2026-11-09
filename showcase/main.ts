// The showcase: every component of the kit in every state (plans/PLAN.md,
// "Showcase"). It grows with each milestone; K3 gives it its design. The
// smoke (scripts/smoke.mjs) drives it in a real browser.

import { format } from '../src/core/format';
import { History } from '../src/core/history';
import type { Translate } from '../src/core/message';
import { kitEn } from '../src/i18n/index';
import { renderControls, type Control } from '../src/ui/controls';
import { el } from '../src/ui/dom';

const en = {
  ...kitEn,
  'demo.width': 'Width',
  'demo.height': 'Height',
  'demo.mm': 'mm',
  'demo.spin': 'Spin',
  'demo.shape': 'Shape',
  'demo.box': 'Box',
  'demo.cylinder': 'Cylinder',
  'demo.walls': 'Walls',
  'demo.front': 'Front',
  'demo.back': 'Back',
  'demo.left': 'Left',
  'demo.lid': 'Lid',
  'demo.lid.note': '{n} {n|screw|screws} M3 × 8',
  'demo.name': 'Name',
  'demo.name.placeholder': 'Name the project',
  'demo.text': 'Text',
  'demo.font': 'Font',
  'demo.locked': 'Size from the boards',
  'demo.reset': 'Reset the size',
  'demo.reset.button': 'Reset',
  'demo.view': 'View',
};
type Key = keyof typeof en;
const t: Translate<Key> = (key, params) => format(en[key], params, 'en');

interface Demo {
  width: number;
  height: number;
  spin: number;
  shape: string;
  walls: string[];
  lid: boolean;
  name: string;
  text: string;
  font: string;
  locked: boolean;
  view: string;
}

const initial: Demo = {
  width: 60,
  height: 30,
  spin: 0,
  shape: 'box',
  walls: ['front'],
  lid: true,
  name: 'My box',
  text: 'Hello',
  font: 'sans',
  locked: false,
  view: 'iso',
};

const controls: readonly Control<Demo, Key>[] = [
  {
    kind: 'text',
    key: 'name',
    label: 'demo.name',
    maxLength: 60,
    placeholder: 'demo.name.placeholder',
    get: (s) => s.name,
    set: (s, name) => ({ ...s, name }),
  },
  {
    kind: 'segmented',
    key: 'shape',
    label: 'demo.shape',
    options: [
      { value: 'box', label: 'demo.box' },
      { value: 'cylinder', label: 'demo.cylinder' },
    ],
    get: (s) => s.shape,
    set: (s, shape) => ({ ...s, shape }),
  },
  { kind: 'check', key: 'locked', label: 'demo.locked', get: (s) => s.locked, set: (s, locked) => ({ ...s, locked }) },
  {
    kind: 'range',
    key: 'width',
    label: 'demo.width',
    min: 20,
    max: 200,
    step: 0.5,
    unit: 'demo.mm',
    disabled: (s) => s.locked,
    get: (s) => s.width,
    set: (s, width) => ({ ...s, width }),
  },
  {
    kind: 'range',
    key: 'height',
    label: 'demo.height',
    min: 5,
    max: (s) => s.width,
    step: 1,
    unit: 'demo.mm',
    when: (s) => s.shape === 'box',
    get: (s) => s.height,
    set: (s, height) => ({ ...s, height }),
  },
  {
    kind: 'range',
    key: 'spin',
    label: 'demo.spin',
    min: 0,
    max: 359,
    step: 1,
    values: { list: [0, 90, 180, 270], suffix: '°' },
    get: (s) => s.spin,
    set: (s, spin) => ({ ...s, spin }),
  },
  {
    kind: 'toggles',
    key: 'walls',
    label: 'demo.walls',
    options: [
      { value: 'front', label: 'demo.front' },
      { value: 'back', label: 'demo.back' },
      { value: 'left', label: 'demo.left' },
    ],
    optionDisabled: (s, value) => value === 'left' && s.shape === 'cylinder',
    get: (s) => s.walls,
    set: (s, walls) => ({ ...s, walls }),
  },
  {
    kind: 'check',
    key: 'lid',
    label: 'demo.lid',
    note: { key: 'demo.lid.note', params: { n: 4 }, when: (s) => s.lid },
    get: (s) => s.lid,
    set: (s, lid) => ({ ...s, lid }),
  },
  { kind: 'textarea', key: 'text', label: 'demo.text', rows: 2, maxLength: 200, get: (s) => s.text, set: (s, text) => ({ ...s, text }) },
  {
    kind: 'select',
    key: 'font',
    label: 'demo.font',
    options: [
      { value: 'sans', text: 'Noto Sans' },
      { value: 'serif', text: 'PT Serif' },
    ],
    get: (s) => s.font,
    set: (s, font) => ({ ...s, font }),
  },
  {
    kind: 'button',
    key: 'reset',
    label: 'demo.reset',
    button: 'demo.reset.button',
    apply: (s) => ({ ...s, width: initial.width, height: initial.height }),
  },
];

const history = new History(initial);
const status = el('status', HTMLElement);
const undo = el('undo', HTMLButtonElement);
const redo = el('redo', HTMLButtonElement);

const show = (): void => {
  handle.sync(history.state);
  undo.disabled = !history.canUndo;
  redo.disabled = !history.canRedo;
  status.textContent = JSON.stringify(history.state);
};

const handle = renderControls(el('panel', HTMLElement), controls, {
  read: () => history.state,
  change: (next, final) => {
    if (final) history.commit(next);
    else history.live(next);
    show();
  },
  idPrefix: 'demo',
  t,
});

undo.addEventListener('click', () => {
  history.undo();
  show();
});
redo.addEventListener('click', () => {
  history.redo();
  show();
});
show();
