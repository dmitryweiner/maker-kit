// The kit's panel over an app's state, with the app's dictionary.

import { renderControls, type Control } from 'maker-kit/ui/controls';
import { make } from 'maker-kit/ui/dom';
import { holdToRepeat } from 'maker-kit/ui/stepper';
import { t, type Key } from './use';

interface Box {
  w: number;
}

const controls: readonly Control<Box, Key>[] = [
  { kind: 'range', key: 'w', label: 'hello', min: 10, max: 100, step: 1, get: (s) => s.w, set: (s, w) => ({ ...s, w }) },
];

export function panel(read: () => Box, change: (next: Box, final: boolean) => void): HTMLElement {
  const root = make('div');
  renderControls(root, controls, { read, change, idPrefix: 'box', t });
  const extra = make('button');
  holdToRepeat(extra, { step: () => {}, end: () => {} });
  return root;
}

// the rest of the kit's ui: compiled and bundled with an app's options
export { renderBanner } from 'maker-kit/ui/banner';
export { createCard, restoreCards, snapshotCards } from 'maker-kit/ui/card';
export { bindHistory, isTextEntry, shortcutLetter } from 'maker-kit/ui/historyKeys';
export { createLanguagePicker } from 'maker-kit/ui/languagePicker';
export { createModal, modalOpen } from 'maker-kit/ui/modal';
export { renderPresetList } from 'maker-kit/ui/presetList';
export { createProgress } from 'maker-kit/ui/progress';
export { setupSheet } from 'maker-kit/ui/sheet';
export type { JobProgress } from 'maker-kit/core/progress';
