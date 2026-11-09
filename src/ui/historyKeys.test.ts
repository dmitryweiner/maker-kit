// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { bindHistory, isTextEntry, shortcutLetter, type HistoryKeysHandle } from './historyKeys';
import { createModal } from './modal';

let log: string[];
let can: { undo: boolean; redo: boolean };
let undo: HTMLButtonElement;
let redo: HTMLButtonElement;
const bound: HistoryKeysHandle[] = [];

function get<T extends Element>(id: string, ctor: abstract new () => T): T {
  const node = document.getElementById(id);
  if (!(node instanceof ctor)) throw new Error(id);
  return node;
}

const press = (target: EventTarget, init: KeyboardEventInit) => {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(event);
  return event;
};

beforeEach(() => {
  document.body.innerHTML = `
    <button id="undo">↶</button><button id="redo">↷</button>
    <input id="slider" type="range" /><input id="box" type="checkbox" /><select id="pick"></select>
    <input id="name" type="text" /><textarea id="text"></textarea><input id="size" type="number" />
    <div id="dialog" class="modal" hidden><div class="modal-box"><button id="x">✕</button></div></div>`;
  log = [];
  can = { undo: true, redo: true };
  undo = get('undo', HTMLButtonElement);
  redo = get('redo', HTMLButtonElement);
  bound.push(
    bindHistory({
      undo,
      redo,
      onUndo: () => log.push('undo'),
      onRedo: () => log.push('redo'),
      canUndo: () => can.undo,
      canRedo: () => can.redo,
    }),
  );
});

afterEach(() => {
  for (const handle of bound.splice(0)) handle.dispose();
});

describe('shortcutLetter', () => {
  it('is the Latin letter of the key, or the key’s place on a Cyrillic or Hebrew layout', () => {
    expect(shortcutLetter(new KeyboardEvent('keydown', { key: 'Z', code: 'KeyZ' }))).toBe('z');
    expect(shortcutLetter(new KeyboardEvent('keydown', { key: 'я', code: 'KeyZ' }))).toBe('z');
    expect(shortcutLetter(new KeyboardEvent('keydown', { key: 'ז', code: 'KeyZ' }))).toBe('z');
    // Dvorak: the letter, not the place
    expect(shortcutLetter(new KeyboardEvent('keydown', { key: 'z', code: 'Slash' }))).toBe('z');
    expect(shortcutLetter(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter' }))).toBe('enter');
  });
});

describe('isTextEntry', () => {
  it('is a field with typed text, and so an undo of its own', () => {
    expect(['name', 'text', 'size'].map((id) => isTextEntry(document.getElementById(id)))).toEqual([true, true, true]);
    expect(['slider', 'box', 'pick', 'undo'].map((id) => isTextEntry(document.getElementById(id)))).toEqual([false, false, false, false]);
    expect(isTextEntry(null)).toBe(false);
  });
});

describe('bindHistory', () => {
  it('undoes on Ctrl+Z and redoes on Shift+Ctrl+Z and Ctrl+Y, ⌘ too', () => {
    press(document.body, { key: 'z', code: 'KeyZ', ctrlKey: true });
    press(document.body, { key: 'Z', code: 'KeyZ', ctrlKey: true, shiftKey: true });
    press(document.body, { key: 'y', code: 'KeyY', ctrlKey: true });
    press(document.body, { key: 'z', code: 'KeyZ', metaKey: true });
    expect(log).toEqual(['undo', 'redo', 'redo', 'undo']);
  });

  it('works on a Cyrillic or Hebrew layout, where the key is я or ז', () => {
    const event = press(document.body, { key: 'я', code: 'KeyZ', ctrlKey: true });
    press(document.body, { key: 'ז', code: 'KeyZ', ctrlKey: true });
    expect(log).toEqual(['undo', 'undo']);
    expect(event.defaultPrevented).toBe(true);
  });

  it('works right after a slider, a check box or a select: they keep the focus after a change', () => {
    for (const id of ['slider', 'box', 'pick']) press(get(id, HTMLElement), { key: 'z', code: 'KeyZ', ctrlKey: true });
    expect(log).toEqual(['undo', 'undo', 'undo']);
  });

  it('leaves a text field its own undo of the text', () => {
    for (const id of ['name', 'text', 'size']) {
      const event = press(get(id, HTMLElement), { key: 'z', code: 'KeyZ', ctrlKey: true });
      expect(event.defaultPrevented).toBe(false);
    }
    expect(log).toEqual([]);
  });

  it('does nothing without Ctrl or ⌘, or with nothing to undo', () => {
    press(document.body, { key: 'z', code: 'KeyZ' });
    can = { undo: false, redo: false };
    press(document.body, { key: 'z', code: 'KeyZ', ctrlKey: true });
    press(document.body, { key: 'y', code: 'KeyY', ctrlKey: true });
    expect(log).toEqual([]);
  });

  it('waits while a dialog is open', () => {
    const dialog = createModal(get('dialog', HTMLElement));
    dialog.open();
    press(get('x', HTMLElement), { key: 'z', code: 'KeyZ', ctrlKey: true });
    dialog.close();
    expect(log).toEqual([]);
  });

  it('works the buttons, disabled when there is nothing to do', () => {
    const handle = bindHistory({ undo, redo, onUndo: () => log.push('u2'), onRedo: () => {}, canUndo: () => false, canRedo: () => true });
    bound.push(handle);
    handle.refresh();
    expect([undo.disabled, redo.disabled]).toEqual([true, false]);
    redo.click();
    expect(log).toContain('redo');
  });
});
