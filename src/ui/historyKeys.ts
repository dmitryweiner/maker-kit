// Undo and redo from the top bar's ↶ ↷ and the keyboard (Plate Builder's):
// Ctrl/⌘+Z, Shift+Ctrl/⌘+Z and Ctrl/⌘+Y.
//
// - Matched by the key's place when its letter is not Latin: on a Cyrillic
//   or Hebrew layout `event.key` is `я` or `ז`, and a match on it did
//   nothing. Apps use `shortcutLetter` for their own shortcuts too.
// - Skipped only while the focus is in a field with typed text: its own undo
//   of the text wins. A slider, a check box or a select keeps the focus after
//   a change — skipping any form field meant Ctrl+Z did nothing after a drag.
// - Skipped while a dialog is open.

import { modalOpen } from './modal';

/** The letter of a Ctrl/⌘ shortcut on any layout: `event.key` if Latin, else the key's place (`event.code`). */
export function shortcutLetter(event: KeyboardEvent): string {
  const key = event.key.toLowerCase();
  if (/^[a-z]$/.test(key)) return key;
  return /^Key[A-Z]$/.test(event.code) ? event.code.slice(3).toLowerCase() : key;
}

/** Inputs without typed text: their changes are the app's to undo. */
const NO_TEXT = new Set(['range', 'checkbox', 'radio', 'color', 'file', 'button', 'submit', 'reset', 'image']);

/** A field with typed text and so an undo of its own: a textarea, an input but range, checkbox, radio, color, file, buttons. */
export function isTextEntry(target: EventTarget | null): boolean {
  if (target instanceof HTMLTextAreaElement) return true;
  return target instanceof HTMLInputElement && !NO_TEXT.has(target.type);
}

export interface HistoryBinding {
  undo: HTMLButtonElement;
  redo: HTMLButtonElement;
  onUndo(): void;
  onRedo(): void;
  canUndo(): boolean;
  canRedo(): boolean;
}

export interface HistoryKeysHandle {
  /** enables the buttons by what there is to do — after every change */
  refresh(): void;
  dispose(): void;
}

export function bindHistory(o: HistoryBinding): HistoryKeysHandle {
  const refresh = (): void => {
    o.undo.disabled = !o.canUndo();
    o.redo.disabled = !o.canRedo();
  };
  const undo = (): void => {
    if (o.canUndo()) o.onUndo();
    refresh();
  };
  const redo = (): void => {
    if (o.canRedo()) o.onRedo();
    refresh();
  };
  const onKey = (event: KeyboardEvent): void => {
    if (!(event.ctrlKey || event.metaKey) || event.altKey || modalOpen() || isTextEntry(event.target)) return;
    const letter = shortcutLetter(event);
    if (letter === 'z') {
      event.preventDefault();
      if (event.shiftKey) redo();
      else undo();
    } else if (letter === 'y') {
      event.preventDefault();
      redo();
    }
  };
  o.undo.addEventListener('click', undo);
  o.redo.addEventListener('click', redo);
  document.addEventListener('keydown', onKey);
  refresh();
  return {
    refresh,
    dispose() {
      o.undo.removeEventListener('click', undo);
      o.redo.removeEventListener('click', redo);
      document.removeEventListener('keydown', onKey);
    },
  };
}
