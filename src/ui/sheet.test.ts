// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { setupSheet, type NarrowQuery } from './sheet';

/** A media query the test switches by hand. */
function query(initial: boolean): NarrowQuery & { set(next: boolean): void } {
  const listeners: (() => void)[] = [];
  let matches = initial;
  return {
    get matches() {
      return matches;
    },
    addEventListener: (_type, listener) => listeners.push(listener),
    set(next) {
      matches = next;
      for (const listener of listeners) listener();
    },
  };
}

let panel: HTMLElement;
let button: HTMLButtonElement;
let close: HTMLButtonElement;
let view: HTMLElement;

const pointer = (type: string, o: { id?: number; x?: number; y?: number; t?: number } = {}) => {
  const event = new PointerEvent(type, { bubbles: true, pointerId: o.id ?? 1, clientX: o.x ?? 10, clientY: o.y ?? 10 });
  Object.defineProperty(event, 'timeStamp', { value: o.t ?? 0 });
  return event;
};

function get<T extends Element>(id: string, ctor: abstract new () => T): T {
  const node = document.getElementById(id);
  if (!(node instanceof ctor)) throw new Error(id);
  return node;
}

beforeEach(() => {
  document.body.innerHTML = '<div id="panel"></div><button id="open"></button><button id="close"></button><div id="view"></div>';
  panel = get('panel', HTMLElement);
  button = get('open', HTMLButtonElement);
  close = get('close', HTMLButtonElement);
  view = get('view', HTMLElement);
});

describe('setupSheet', () => {
  it('starts open on a phone; its button shows only while it is closed', () => {
    const sheet = setupSheet({ panel, button, close, narrow: query(true) });
    expect([panel.classList.contains('open'), button.hidden, button.getAttribute('aria-expanded')]).toEqual([true, true, 'true']);
    close.click();
    expect([sheet.isOpen(), panel.classList.contains('open'), button.hidden, button.getAttribute('aria-expanded')]).toEqual([
      false,
      false,
      false,
      'false',
    ]);
    button.click();
    expect(sheet.isOpen()).toBe(true);
  });

  it('does nothing on a wide screen, where the panel stands beside the view', () => {
    const narrow = query(false);
    const sheet = setupSheet({ panel, button, narrow });
    sheet.close();
    expect(button.hidden).toBe(true);
    narrow.set(true);
    expect(button.hidden).toBe(false);
  });

  it('opens and closes on request, starting closed when asked', () => {
    const sheet = setupSheet({ panel, button, narrow: query(true), open: false });
    expect(sheet.isOpen()).toBe(false);
    sheet.open();
    expect(panel.classList.contains('open')).toBe(true);
  });

  it('tells when it opens or closes, and not when nothing changes', () => {
    let changes = 0;
    const sheet = setupSheet({ panel, button, close, narrow: query(true), onChange: () => changes++ });
    sheet.open();
    expect(changes).toBe(0);
    sheet.close();
    button.click();
    expect(changes).toBe(2);
  });

  it('reports how much of the view it covers: its height open on a phone, else nothing', () => {
    const insets: number[] = [];
    Object.defineProperty(panel, 'offsetHeight', { value: 300 });
    const narrow = query(true);
    const sheet = setupSheet({ panel, button, narrow, onInset: (px) => insets.push(px) });
    sheet.close();
    sheet.open();
    narrow.set(false);
    expect(insets).toEqual([300, 0, 300, 0]);
  });

  describe('a tap on the view', () => {
    it('closes the open sheet: one finger, short, still', () => {
      const sheet = setupSheet({ panel, button, view, narrow: query(true) });
      view.dispatchEvent(pointer('pointerdown', { t: 0 }));
      view.dispatchEvent(pointer('pointerup', { t: 120, x: 12 }));
      expect(sheet.isOpen()).toBe(false);
    });

    it('lets a drag, a long press and a pinch through to the view', () => {
      const sheet = setupSheet({ panel, button, view, narrow: query(true) });
      view.dispatchEvent(pointer('pointerdown'));
      view.dispatchEvent(pointer('pointermove', { x: 40 }));
      view.dispatchEvent(pointer('pointerup', { x: 40, t: 100 }));
      view.dispatchEvent(pointer('pointerdown', { t: 0 }));
      view.dispatchEvent(pointer('pointerup', { t: 500 }));
      view.dispatchEvent(pointer('pointerdown', { id: 1 }));
      view.dispatchEvent(pointer('pointerdown', { id: 2 }));
      view.dispatchEvent(pointer('pointerup', { id: 2, t: 50 }));
      view.dispatchEvent(pointer('pointerup', { id: 1, t: 60 }));
      expect(sheet.isOpen()).toBe(true);
    });

    it('does nothing on a wide screen', () => {
      const sheet = setupSheet({ panel, button, view, narrow: query(false) });
      view.dispatchEvent(pointer('pointerdown'));
      view.dispatchEvent(pointer('pointerup', { t: 50 }));
      expect(sheet.isOpen()).toBe(true);
    });
  });
});
