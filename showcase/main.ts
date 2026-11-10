// The showcase: every component of the kit in every state, laid out as an
// app on the kit is (plans/PLAN.md, "Showcase") — and wired as one: undo and
// its keys, presets with 📄 New and 💾, the project file, the sheet, the
// dialog, the bar over the view, the banner, folding cards, a list card of
// labels, the message list, the language.
// Switches for the accent, the language (Hebrew mirrors the page) and a
// phone frame. The URL sets them too, so the smoke opens each state directly:
//   ?accent=emerald&lang=he&view=top&sheet=open&modal=presets&progress=running|label&banner=full|blocked&frame=phone

import '../src/styles/kit.css';
import type { SurfaceMesh } from '../src/3d/mesh';
import { encodeSTL, stlFileName } from '../src/3d/stl';
import { assessExport, validateMesh } from '../src/3d/validate';
import { createViewer } from '../src/3d/viewer';
import './showcase.css';
import { format } from '../src/core/format';
import { History } from '../src/core/history';
import type { Translate } from '../src/core/message';
import {
  addUserPreset,
  nextPresetName,
  presetRef,
  presetStatus,
  removeUserPreset,
  renameUserPreset,
  type BuiltInPreset,
  type PresetRef,
  type UserPreset,
} from '../src/core/presets';
import { decodeProjectFile, encodeProjectFile, projectFileName } from '../src/core/projectFile';
import type { StorageWrite } from '../src/core/storage';
import { renderBanner, type StorageStatus } from '../src/ui/banner';
import { createCard, restoreCards, snapshotCards } from '../src/ui/card';
import { renderControls, type Control } from '../src/ui/controls';
import { renderItemList } from '../src/ui/listCard';
import { renderMessages } from '../src/ui/messageList';
import { el, make } from '../src/ui/dom';
import { download, pickFile } from '../src/ui/files';
import { bindHistory } from '../src/ui/historyKeys';
import { createLanguagePicker } from '../src/ui/languagePicker';
import { createModal } from '../src/ui/modal';
import { renderPresetList } from '../src/ui/presetList';
import { createProgress } from '../src/ui/progress';
import { setupSheet } from '../src/ui/sheet';
import { WorkerClient, moduleWorker } from '../src/worker/client';
import type { BoxJob } from './boxJob';
import { dictionaries, isLocale, LOCALES, type Key, type Locale } from './i18n';
import { registerServiceWorker } from './pwa';
import { drawScene, isView, type View } from './scene';

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
  /** the list card's items: in the state, so add, delete and the rest are undo steps */
  labels: Label[];
}

interface Label {
  id: string;
  text: string;
  visible: boolean;
}

const LABELS_MAX = 4;

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
  labels: [
    { id: 'l1', text: 'Hello', visible: true },
    { id: 'l2', text: 'v1.0', visible: false },
    { id: 'l3', text: 'ESP32', visible: true },
  ],
};

/** A label id no label has: one past the largest number. */
const nextLabelId = (labels: readonly Label[]): string => `l${Math.max(0, ...labels.map((label) => Number(label.id.slice(1)) || 0)) + 1}`;

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
  const viewParam = params.get('view');
  let locale: Locale = isLocale(langParam) ? langParam : 'en';
  let view: View = isView(viewParam) ? viewParam : 'iso';
  const t: Translate<Key> = (key, values) => format(dictionaries[locale][key], values, locale);
  const history = new History(initial);

  // ---- presets: two built-in, the blank one 📄 opens, and the user's (in memory here) ----
  const builtIn: readonly (BuiltInPreset<Demo> & { label: Key; note?: Key })[] = [
    {
      id: 'pi',
      label: 'demo.preset.pi',
      note: 'demo.preset.pi.note',
      build: () => ({ ...initial, name: t('demo.preset.pi'), width: 95, height: 35 }),
    },
    {
      id: 'esp',
      label: 'demo.preset.esp',
      note: 'demo.preset.esp.note',
      build: () => ({ ...initial, name: t('demo.preset.esp'), width: 50, height: 25 }),
    },
  ];
  const blank: BuiltInPreset<Demo> = { id: 'blank', listed: false, build: () => ({ ...initial, name: t('demo.preset.blank') }) };
  let user: UserPreset<Demo>[] = [{ id: 'u1', name: 'My box', state: initial }];
  let current: PresetRef = 'u:u1';
  const find = (ref: PresetRef): Demo | undefined =>
    ref === 'b:blank'
      ? blank.build()
      : (builtIn.find((p) => presetRef('b', p.id) === ref)?.build() ?? user.find((p) => presetRef('u', p.id) === ref)?.state);
  /** the view and the font do not make another project */
  const signature = (s: Demo): string => JSON.stringify({ ...s, spin: null, name: null });

  // ---- the showcase's own switches ----
  interface ShowcaseState {
    accent: Accent;
    frame: boolean;
    banner: boolean;
  }
  const bannerParam = params.get('banner');
  let showcase: ShowcaseState = { accent: isAccent(accentParam) ? accentParam : 'cyan', frame: false, banner: bannerParam !== null };
  let storage: StorageStatus = {
    project: bannerParam === 'blocked' ? 'blocked' : bannerParam !== null ? 'full' : 'ok',
    preset: bannerParam === 'blocked' ? { action: 'delete', result: 'blocked' } : null,
  };
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

  // ---- the kit's pieces ----
  const presetsOpen = el('presetsOpen', HTMLButtonElement);
  const presetsDialog = createModal(el('presets', HTMLElement), { close: el('presetsClose', HTMLButtonElement) });
  const keys = bindHistory({
    undo: el('undo', HTMLButtonElement),
    redo: el('redo', HTMLButtonElement),
    onUndo: () => {
      history.undo();
      show();
    },
    onRedo: () => {
      history.redo();
      show();
    },
    canUndo: () => history.canUndo,
    canRedo: () => history.canRedo,
  });
  // ---- the 3D view: the kit's viewer, the box built in a worker; the SVG stand-in without WebGL ----
  const viewer = createViewer(el('viewCanvas', HTMLCanvasElement));
  el('scene', HTMLElement).hidden = viewer !== null;
  el('viewCanvas', HTMLCanvasElement).hidden = viewer === null;
  const client = new WorkerClient<BoxJob, SurfaceMesh>(
    moduleWorker(() => new Worker(new URL('./box.worker.ts', import.meta.url), { type: 'module' })),
    { lane: () => 'box', kept: (job) => job.export },
  );
  let built = '';

  setupSheet({
    onInset: (px) => viewer?.setInset(px),
    panel: el('panel', HTMLElement),
    button: el('sheetOpen', HTMLButtonElement),
    close: el('sheetClose', HTMLButtonElement),
    view: el('view', HTMLElement),
    narrow: window.matchMedia('(max-width: 1023px)'),
    open: params.get('sheet') === 'open',
  });
  const progress = createProgress(el('viewProgress', HTMLElement), { t });
  const language = createLanguagePicker(document.querySelector<HTMLElement>('.topbar') ?? document.body, {
    locales: LOCALES,
    current: locale,
    t,
    onChange: (next) => {
      locale = next;
      render();
    },
  });

  const handles: { sync(state: Demo): void }[] = [];
  // ---- the list card: the open label's controls are one node, moved into its row ----
  let openLabel: string | null = 'l1';
  const labelBody = make('div');
  const labelControls: readonly Control<Demo, Key>[] = [
    {
      kind: 'text',
      key: 'text',
      label: 'demo.labels.text',
      maxLength: 40,
      get: (s) => s.labels.find((label) => label.id === openLabel)?.text ?? '',
      set: (s, text) => ({ ...s, labels: s.labels.map((label) => (label.id === openLabel ? { ...label, text } : label)) }),
    },
  ];
  const editLabels = (labels: Label[]): void => changeDemo({ ...history.state, labels }, true);
  let showcaseHandle: { sync(state: ShowcaseState): void } | null = null;
  let cards: { setEnabled(on: boolean): void }[] = [];
  let fileNote = '';

  /** Opens another project: one undo step, so undo brings the old one back. */
  const openProject = (state: Demo, ref: PresetRef): void => {
    history.commit(state);
    current = ref;
    show();
  };
  const changeDemo = (next: Demo, final: boolean): void => {
    if (final) history.commit(next);
    else history.live(next);
    show();
  };
  /** A worker job under the bar; its stages come back as messages, checked against the dictionary. */
  const run = (job: BoxJob, label?: Key) =>
    progress.track(
      (onProgress) =>
        client.run(job, (p) => {
          const stage = p.label && isKey(p.label.code) ? { code: p.label.code, params: p.label.params } : undefined;
          onProgress({ step: p.step, total: p.total, label: stage });
        }),
      label ? { label, delayMs: 0 } : {},
    );
  /** Builds the box again when its size changes; a fresher request replaces a waiting one. */
  function build(state: Demo): void {
    const key = `${state.width}x${state.height}`;
    if (key === built) return;
    built = key;
    void run({ width: state.width, depth: 40, height: state.height, export: false }).then((done) => {
      if (!done) return;
      viewer?.setMeshes([{ mesh: done.result }]);
      // for the smoke: what the view shows now
      el('view', HTMLElement).dataset.triangles = String(done.result.indices.length / 3);
    });
  }

  const changeShowcase = (next: ShowcaseState): void => {
    if (next.frame) {
      location.search = new URLSearchParams({ accent: next.accent, lang: locale, frame: 'phone' }).toString();
      return;
    }
    if (next.banner !== showcase.banner) storage = { project: next.banner ? 'full' : 'ok', preset: null };
    showcase = next;
    show();
    viewer?.recolor();
  };
  /** what a preset action's write gave: the showcase keeps nothing, the banner shows the switch's failure */
  const presetWrite = (action: 'save' | 'delete'): void => {
    const result: StorageWrite = storage.project;
    storage = { ...storage, preset: result === 'ok' ? null : { action, result } };
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
    language.set(locale);
    const o = { read: () => history.state, change: changeDemo, t };
    const cardsRoot = el('cards', HTMLElement);
    const folded = snapshotCards(cardsRoot);
    cardsRoot.replaceChildren();
    const lidCard = createCard(cardsRoot, {
      id: 'lid',
      title: 'demo.lid',
      tag: { text: 'M3' },
      desc: 'demo.lid.desc',
      enabled: history.state.screws,
      t,
    });
    const ventsCard = createCard(cardsRoot, { id: 'vents', title: 'demo.vents', desc: 'demo.vents.desc', enabled: false, t });
    restoreCards(cardsRoot, folded);
    cards = [lidCard, ventsCard];
    handles.length = 0;
    handles.push(
      renderControls(el('controlsPanel', HTMLElement), controls, { ...o, idPrefix: 'demo' }),
      renderControls(el('statesPanel', HTMLElement), states, { ...o, idPrefix: 'state' }),
      renderControls(lidCard.body, lid, { ...o, idPrefix: 'lid' }),
      renderControls(labelBody, labelControls, { ...o, idPrefix: 'label' }),
    );
    showcaseHandle = renderControls(el('showcasePanel', HTMLElement), showcaseControls, {
      read: () => showcase,
      change: changeShowcase,
      idPrefix: 'showcase',
      t,
    });
    show();
    progress.refresh();
  }

  function show(): void {
    const state = history.state;
    html.dataset.accent = showcase.accent;
    for (const handle of handles) handle.sync(state);
    showcaseHandle?.sync(showcase);
    cards[0]?.setEnabled(state.screws);
    keys.refresh();
    const status = presetStatus(current, state, find, signature);
    presetsOpen.textContent = state.name || t('demo.name.placeholder');
    presetsOpen.classList.toggle('changed', status === 'changed');
    renderBanner(el('banner', HTMLElement), storage, {
      t,
      // the showcase has a project file: the kit's own advice
      advice: { blocked: 'kit.storage.advice.file', full: 'kit.storage.advice.fileFull' },
      onDismiss: () => {
        storage = { ...storage, preset: null };
        show();
      },
    });
    // a label undone away is no longer open
    if (!state.labels.some((label) => label.id === openLabel)) openLabel = null;
    renderItemList(el('labelList', HTMLElement), {
      items: state.labels.map((label, i) => ({
        id: label.id,
        title: t('demo.labels.title', { n: i + 1 }),
        hint: label.text,
        icon: 'T',
        visible: label.visible,
      })),
      open: openLabel,
      body: () => labelBody,
      t,
      idPrefix: 'labels',
      select: (id) => {
        openLabel = id;
        show();
      },
      toggle: (id) => editLabels(history.state.labels.map((label) => (label.id === id ? { ...label, visible: !label.visible } : label))),
      duplicate: (id) => {
        const labels = history.state.labels;
        const at = labels.findIndex((label) => label.id === id);
        const copy = labels[at];
        if (!copy || labels.length >= LABELS_MAX) return;
        openLabel = nextLabelId(labels);
        editLabels([...labels.slice(0, at + 1), { ...copy, id: openLabel }, ...labels.slice(at + 1)]);
      },
      remove: (id) => editLabels(history.state.labels.filter((label) => label.id !== id)),
    });
    el('labelsCount', HTMLElement).textContent = `${state.labels.length} / ${LABELS_MAX}`;
    el('addLabel', HTMLButtonElement).disabled = state.labels.length >= LABELS_MAX;
    renderMessages(el('messages', HTMLUListElement), [
      { severity: 'bad', text: t('demo.msg.bad'), code: 'kit.mesh.open' },
      {
        severity: 'warn',
        text: t('demo.msg.warn'),
        code: 'demo.post',
        mark: '⚠ 1',
        // where the warning is: a look from above
        action: {
          label: t('demo.show'),
          run: () => {
            view = 'top';
            viewer?.camera(view);
            show();
          },
        },
      },
      { severity: 'info', text: t('demo.msg.info'), code: 'demo.screws' },
    ]);
    el('viewStatus', HTMLElement).textContent = fileNote || `${state.width} × ${state.height} mm`;
    if (viewer) build(state);
    else drawScene(el('scene', HTMLElement), view, state);
    for (const chip of document.querySelectorAll<HTMLButtonElement>('.chip'))
      chip.setAttribute('aria-pressed', String(chip.dataset.view === view));
    renderPresetList(el('presetList', HTMLElement), {
      builtIn: builtIn.map((p) => ({ id: p.id, label: t(p.label), note: p.note && t(p.note) })),
      user: user.map((p) => ({ id: p.id, name: p.name })),
      current,
      status,
      t,
      open: (ref) => {
        const opened = find(ref);
        if (opened) openProject(opened, ref);
        presetsDialog.close();
      },
      rename: (id, name) => {
        user = renameUserPreset(user, id, name);
        show();
      },
      remove: (id) => {
        user = removeUserPreset(user, id);
        if (current === presetRef('u', id)) current = '';
        presetWrite('delete');
        show();
      },
    });
  }

  // ---- the top bar's tools ----
  presetsOpen.addEventListener('click', () => presetsDialog.open(presetsOpen));
  el('newProject', HTMLButtonElement).addEventListener('click', () => openProject(blank.build(), 'b:blank'));
  el('savePreset', HTMLButtonElement).addEventListener('click', () => {
    const prefixes = LOCALES.map((code) => dictionaries[code]['demo.preset.auto'].replace(/\s*\{n\}\s*/, ''));
    const name = history.state.name || nextPresetName(user, prefixes, t('demo.preset.auto').replace(/\s*\{n\}\s*/, ''));
    const added = addUserPreset(user, name, history.state);
    user = added.list;
    current = presetRef('u', added.id);
    presetWrite('save');
    show();
  });
  el('saveFile', HTMLButtonElement).addEventListener('click', () => {
    const text = encodeProjectFile({ app: 'maker-kit-showcase', version: 1, name: history.state.name, state: history.state });
    download(projectFileName(history.state.name, 'box.json', 'box'), text, 'application/json');
  });
  el('openFile', HTMLButtonElement).addEventListener('click', () => {
    void pickFile('.json,application/json').then(async (file) => {
      if (!file) return;
      const read = decodeProjectFile(await file.text(), {
        app: 'maker-kit-showcase',
        version: 1,
        sanitize: (s) => ({ ...initial, ...(typeof s === 'object' ? s : {}) }),
      });
      fileNote = read.ok ? '' : t(`kit.file.${read.reason}`);
      if (read.ok) openProject(read.state, '');
      else show();
    });
  });
  el('addLabel', HTMLButtonElement).addEventListener('click', () => {
    const labels = history.state.labels;
    if (labels.length >= LABELS_MAX) return;
    openLabel = nextLabelId(labels);
    editLabels([...labels, { id: openLabel, text: t('demo.labels.new'), visible: true }]);
  });
  for (const chip of document.querySelectorAll<HTMLButtonElement>('.chip')) {
    chip.addEventListener('click', () => {
      if (isView(chip.dataset.view)) view = chip.dataset.view;
      viewer?.camera(view);
      show();
    });
  }

  // ---- the export: a kept job, its mesh checked before the file is made ----
  el('downloadStl', HTMLButtonElement).addEventListener('click', () => {
    const { name, width, height } = history.state;
    void run({ width, depth: 40, height, export: true }, 'demo.jobs.exporting').then((done) => {
      if (!done) return;
      const { blockers } = assessExport(validateMesh(done.result), true);
      fileNote = blockers.map((message) => t(message.code, message.params)).join(' ');
      if (blockers.length === 0) download(stlFileName(name, 'box'), encodeSTL(done.result, { brand: 'maker-kit', name }), 'model/stl');
      show();
    });
  });

  // ---- the bar over the view: one bar for any number of jobs, after 300 ms ----
  el('jobsTwo', HTMLButtonElement).addEventListener('click', () => {
    void progress.track(sleep(1500));
    window.setTimeout(() => void progress.track(sleep(1500)), 800);
  });
  el('jobsQuick', HTMLButtonElement).addEventListener('click', () => void progress.track(sleep(150)));
  el('jobsExport', HTMLButtonElement).addEventListener(
    'click',
    () => void progress.track(sleep(2500), { label: 'demo.jobs.exporting', delayMs: 0 }),
  );
  el('jobsSteps', HTMLButtonElement).addEventListener('click', () => {
    void progress.track(
      async (onProgress) => {
        for (let step = 0; step <= 5; step++) {
          onProgress({ step, total: 5 });
          // oxlint-disable-next-line no-await-in-loop -- the steps of a fake job follow one another
          await sleep(500);
        }
      },
      { delayMs: 0 },
    );
  });
  const forever = new Promise<void>(() => {});
  if (params.get('progress') === 'running') void progress.track(forever, { delayMs: 0 });
  if (params.get('progress') === 'label') void progress.track(forever, { label: 'demo.jobs.exporting', delayMs: 0 });

  render();
  // the accent is on <html> only now: the view takes its colours again
  viewer?.recolor();
  if (view !== 'iso') viewer?.camera(view);
  if (params.get('modal') === 'presets') presetsDialog.open(presetsOpen);
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => window.setTimeout(resolve, ms));

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

// offline after a first visit (a build only: the dev server has no service worker)
if (import.meta.env.PROD) registerServiceWorker(navigator, window, document);
