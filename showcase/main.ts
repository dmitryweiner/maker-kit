// The showcase: every component of the kit in every state, laid out as an
// app on the kit is (plans/PLAN.md, "Showcase"). Switches for the accent,
// the language (Hebrew mirrors the page) and a phone frame. The URL sets
// them too, so the smoke opens each state directly:
//   ?accent=emerald&lang=he&sheet=open&modal=presets&progress=label&banner=1&frame=phone
// The sheet, the dialog and the bar are drawn by hand until K4 brings
// ui/sheet, ui/modal and ui/progress.

import '../src/styles/kit.css';
import './showcase.css';
import { format } from '../src/core/format';
import { History } from '../src/core/history';
import type { Translate } from '../src/core/message';
import { renderControls, type Control } from '../src/ui/controls';
import { el, make } from '../src/ui/dom';
import { dictionaries, ENDONYMS, isLocale, LOCALES, type Key, type Locale } from './i18n';

const params = new URLSearchParams(location.search);

type Accent = 'cyan' | 'emerald' | 'burgundy';
const ACCENTS: readonly Accent[] = ['cyan', 'emerald', 'burgundy'];
const isAccent = (value: unknown): value is Accent => ACCENTS.some((accent) => accent === value);

interface Demo {
  name: string;
  shape: string;
  width: number;
  height: number;
  spin: number;
  walls: string[];
  text: string;
  font: string;
  locked: boolean;
  wall: number;
  clearance: number;
  screws: boolean;
  depth: number;
}

const initial: Demo = {
  name: 'My box',
  shape: 'box',
  width: 60,
  height: 30,
  spin: 0,
  walls: ['front'],
  text: 'Hello',
  font: 'sans',
  locked: true,
  wall: 4,
  clearance: 3,
  screws: true,
  depth: 4,
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
  {
    kind: 'range',
    key: 'width',
    label: 'demo.width',
    min: 20,
    max: 200,
    step: 0.5,
    unit: 'demo.mm',
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
    hint: 'demo.spin.hint',
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
  { kind: 'textarea', key: 'text', label: 'demo.text', rows: 2, maxLength: 200, get: (s) => s.text, set: (s, text) => ({ ...s, text }) },
  {
    kind: 'select',
    key: 'font',
    label: 'demo.font',
    options: [
      { value: 'sans', text: 'Noto Sans' },
      { value: 'serif', text: 'PT Serif' },
      { value: 'script', text: 'Marck Script' },
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

/** The states: at a limit, computed elsewhere, a long name, a note. */
const states: readonly Control<Demo, Key>[] = [
  {
    kind: 'range',
    key: 'wall',
    label: 'demo.atMax',
    min: 1,
    max: 4,
    step: 0.1,
    unit: 'demo.mm',
    get: (s) => s.wall,
    set: (s, wall) => ({ ...s, wall }),
  },
  { kind: 'check', key: 'locked', label: 'demo.locked', get: (s) => s.locked, set: (s, locked) => ({ ...s, locked }) },
  {
    kind: 'range',
    key: 'computed',
    label: 'demo.computed',
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
    key: 'clearance',
    label: 'demo.longName',
    min: 0,
    max: 20,
    step: 0.5,
    unit: 'demo.mm',
    get: (s) => s.clearance,
    set: (s, clearance) => ({ ...s, clearance }),
  },
];

const lid: readonly Control<Demo, Key>[] = [
  {
    kind: 'check',
    key: 'screws',
    label: 'demo.lid.screws',
    note: { key: 'demo.lid.note', params: { n: 4 }, when: (s) => s.screws },
    get: (s) => s.screws,
    set: (s, screws) => ({ ...s, screws }),
  },
  {
    kind: 'range',
    key: 'depth',
    label: 'demo.lid.depth',
    min: 2,
    max: 12,
    step: 0.5,
    unit: 'demo.mm',
    get: (s) => s.depth,
    set: (s, depth) => ({ ...s, depth }),
  },
];

function start(): void {
  const html = document.documentElement;
  const langParam = params.get('lang');
  const accentParam = params.get('accent');
  let locale: Locale = isLocale(langParam) ? langParam : 'en';
  let accent: Accent = isAccent(accentParam) ? accentParam : 'cyan';
  const t: Translate<Key> = (key, values) => format(dictionaries[locale][key], values, locale);
  const history = new History(initial);

  // ---- the panel, drawn again on a language switch ----
  interface ShowcaseState {
    accent: Accent;
    frame: boolean;
    banner: boolean;
  }
  let showcase: ShowcaseState = { accent, frame: false, banner: params.get('banner') === '1' };
  const showcaseControls: readonly Control<ShowcaseState, Key>[] = [
    {
      kind: 'segmented',
      key: 'accent',
      label: 'demo.accent',
      options: ACCENTS.map((value) => ({ value, label: `demo.accent.${value}` as const })),
      get: (s) => s.accent,
      set: (s, value) => ({ ...s, accent: isAccent(value) ? value : s.accent }),
    },
    { kind: 'check', key: 'banner', label: 'demo.banner', get: (s) => s.banner, set: (s, banner) => ({ ...s, banner }) },
    { kind: 'check', key: 'frame', label: 'demo.frame', get: (s) => s.frame, set: (s, frame) => ({ ...s, frame }) },
  ];

  const handles: { sync(state: Demo): void }[] = [];
  let showcaseHandle: { sync(state: ShowcaseState): void } | null = null;

  const changeDemo = (next: Demo, final: boolean): void => {
    if (final) history.commit(next);
    else history.live(next);
    show();
  };
  const changeShowcase = (next: ShowcaseState): void => {
    showcase = next;
    if (next.frame) {
      const url = new URLSearchParams({ accent: next.accent, lang: locale, frame: 'phone' });
      location.search = url.toString();
      return;
    }
    accent = next.accent;
    show();
  };

  function render(): void {
    html.lang = locale;
    html.dir = locale === 'he' ? 'rtl' : 'ltr';
    for (const node of document.querySelectorAll<HTMLElement>('[data-i18n]')) node.textContent = t(i18nKey(node.dataset.i18n));
    for (const node of document.querySelectorAll<HTMLElement>('[data-i18n-label]')) {
      const text = t(i18nKey(node.dataset.i18nLabel));
      node.setAttribute('aria-label', text);
      if (node instanceof HTMLButtonElement) node.title = text;
    }
    const o = { read: () => history.state, change: changeDemo, t };
    handles.length = 0;
    handles.push(
      renderControls(el('controlsPanel', HTMLElement), controls, { ...o, idPrefix: 'demo' }),
      renderControls(el('statesPanel', HTMLElement), states, { ...o, idPrefix: 'state' }),
      renderControls(el('lidPanel', HTMLElement), lid, { ...o, idPrefix: 'lid' }),
    );
    showcaseHandle = renderControls(el('showcasePanel', HTMLElement), showcaseControls, {
      read: () => showcase,
      change: changeShowcase,
      idPrefix: 'showcase',
      t,
    });
    show();
  }

  const undo = el('undo', HTMLButtonElement);
  const redo = el('redo', HTMLButtonElement);
  const presetsOpen = el('presetsOpen', HTMLButtonElement);
  function show(): void {
    html.dataset.accent = accent;
    for (const handle of handles) handle.sync(history.state);
    showcaseHandle?.sync(showcase);
    undo.disabled = !history.canUndo;
    redo.disabled = !history.canRedo;
    presetsOpen.textContent = history.state.name || t('demo.name.placeholder');
    presetsOpen.classList.toggle('changed', history.canUndo);
    el('banner', HTMLElement).hidden = !showcase.banner;
    el('viewStatus', HTMLElement).textContent = `${history.state.width} × ${history.state.height} mm`;
  }

  const lang = el('lang', HTMLSelectElement);
  for (const code of LOCALES) {
    const option = make('option', undefined, ENDONYMS[code]);
    option.value = code;
    lang.append(option);
  }
  lang.value = locale;
  lang.addEventListener('change', () => {
    if (isLocale(lang.value)) locale = lang.value;
    render();
  });

  undo.addEventListener('click', () => {
    history.undo();
    show();
  });
  redo.addEventListener('click', () => {
    history.redo();
    show();
  });
  el('newProject', HTMLButtonElement).addEventListener('click', () => {
    history.commit({ ...initial, name: '' });
    show();
  });
  el('bannerDismiss', HTMLButtonElement).addEventListener('click', () => changeShowcase({ ...showcase, banner: false }));

  // ---- folding cards: K4's ui/card does this ----
  for (const head of document.querySelectorAll<HTMLButtonElement>('.fcard-head')) {
    head.addEventListener('click', () => {
      const card = head.closest('.fcard');
      const collapsed = !card?.classList.toggle('collapsed');
      head.setAttribute('aria-expanded', String(collapsed));
    });
  }

  // ---- the sheet on a phone: K4's ui/sheet ----
  const panel = el('panel', HTMLElement);
  const sheetOpen = el('sheetOpen', HTMLButtonElement);
  const setSheet = (open: boolean): void => {
    panel.classList.toggle('open', open);
    sheetOpen.hidden = open;
    sheetOpen.setAttribute('aria-expanded', String(open));
  };
  sheetOpen.addEventListener('click', () => setSheet(true));
  el('sheetClose', HTMLButtonElement).addEventListener('click', () => setSheet(false));
  setSheet(params.get('sheet') === 'open');

  // ---- the presets dialog: K4's ui/modal and ui/presetList ----
  const presets = el('presets', HTMLElement);
  const setPresets = (open: boolean): void => {
    presets.hidden = !open;
    presetsOpen.setAttribute('aria-expanded', String(open));
    if (open) el('presetsClose', HTMLButtonElement).focus();
  };
  presetsOpen.addEventListener('click', () => setPresets(true));
  el('presetsClose', HTMLButtonElement).addEventListener('click', () => setPresets(false));
  presets.addEventListener('click', (event) => {
    if (event.target === presets) setPresets(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setPresets(false);
  });
  setPresets(params.get('modal') === 'presets');

  // ---- the bar over the view: K4's ui/progress (one bar for any number of jobs, after 300 ms) ----
  const bar = el('viewProgress', HTMLElement);
  const label = el('progressLabel', HTMLElement);
  const track = el('progressTrack', HTMLElement);
  const fill = el('progressFill', HTMLElement);
  let running = 0;
  const job = (ms: number, o: { delay?: number; text?: string; steps?: number } = {}): void => {
    running++;
    const reveal = window.setTimeout(() => {
      bar.hidden = false;
      label.hidden = !o.text;
      label.textContent = o.text ?? '';
    }, o.delay ?? 300);
    if (o.steps) {
      const steps = o.steps;
      track.classList.remove('running');
      for (let i = 0; i <= steps; i++) window.setTimeout(() => (fill.style.inlineSize = `${(100 * i) / steps}%`), (ms * i) / steps);
    }
    window.setTimeout(() => {
      window.clearTimeout(reveal);
      if (--running > 0) return;
      bar.hidden = true;
      track.classList.add('running');
      fill.style.inlineSize = '';
    }, ms);
  };
  el('jobsTwo', HTMLButtonElement).addEventListener('click', () => {
    job(1500);
    window.setTimeout(() => job(1500), 800);
  });
  el('jobsQuick', HTMLButtonElement).addEventListener('click', () => job(150));
  el('jobsExport', HTMLButtonElement).addEventListener('click', () => job(2500, { delay: 0, text: t('demo.jobs.exporting') }));
  el('jobsSteps', HTMLButtonElement).addEventListener('click', () => job(2500, { delay: 0, steps: 5 }));
  const progress = params.get('progress');
  if (progress === 'running') job(60_000, { delay: 0 });
  if (progress === 'label') job(60_000, { delay: 0, text: t('demo.jobs.exporting') });

  render();
}

const isKey = (value: string): value is Key => Object.hasOwn(dictionaries.en, value);

/** The key of a `data-i18n` attribute; a typo fails loudly (the smoke fails on console errors). */
function i18nKey(value: string | undefined): Key {
  const key = value ?? '';
  if (!isKey(key)) throw new Error(`no message ${key}`);
  return key;
}

// a phone frame: the same page in a 390 × 844 frame, the switches kept
if (params.get('frame') === 'phone') {
  params.delete('frame');
  const frame = make('iframe', 'phone-frame');
  frame.src = `?${params.toString()}`;
  frame.title = 'maker-kit showcase, phone';
  document.body.className = 'phone-host';
  document.body.replaceChildren(frame);
} else {
  start();
}
