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
