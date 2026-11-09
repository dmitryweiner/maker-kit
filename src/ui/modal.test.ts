// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { createModal, modalOpen } from './modal';

const html = `
  <button id="opener">Presets…</button>
  <button id="other">Other</button>
  <div id="presets" class="modal" hidden>
    <div class="modal-box" role="dialog" aria-modal="true">
      <button id="close" class="modal-close">✕</button>
      <input id="name" />
      <button id="last">Open</button>
    </div>
  </div>
  <div id="help" class="modal" hidden><div class="modal-box"><button id="helpClose">✕</button></div></div>`;

function get<T extends Element>(id: string, ctor: abstract new () => T): T {
  const node = document.getElementById(id);
  if (!(node instanceof ctor)) throw new Error(id);
  return node;
}
const key = (k: string, init: KeyboardEventInit = {}) => new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...init });

beforeEach(() => {
  document.body.innerHTML = html;
});

describe('createModal', () => {
  it('opens with the focus inside, closes with it back on its opener', () => {
    const opener = get('opener', HTMLButtonElement);
    const modal = createModal(get('presets', HTMLElement), { close: get('close', HTMLButtonElement) });
    opener.focus();
    modal.open(opener);
    expect([modal.isOpen(), modalOpen(), get('presets', HTMLElement).hidden]).toEqual([true, true, false]);
    expect(document.activeElement?.id).toBe('close');
    expect(opener.getAttribute('aria-expanded')).toBe('true');
    get('close', HTMLButtonElement).click();
    expect([modal.isOpen(), modalOpen(), document.activeElement?.id, opener.getAttribute('aria-expanded')]).toEqual([
      false,
      false,
      'opener',
      'false',
    ]);
  });

  it('closes on Esc, which the app’s own keys then never see', () => {
    const modal = createModal(get('presets', HTMLElement));
    const seen: string[] = [];
    document.addEventListener('keydown', (event) => seen.push(event.key));
    modal.open();
    get('name', HTMLInputElement).dispatchEvent(key('Escape'));
    expect(modal.isOpen()).toBe(false);
    expect(seen).toEqual([]);
  });

  it('closes on a click on the backdrop, not inside the box', () => {
    const modal = createModal(get('presets', HTMLElement));
    modal.open();
    get('name', HTMLInputElement).click();
    expect(modal.isOpen()).toBe(true);
    get('presets', HTMLElement).click();
    expect(modal.isOpen()).toBe(false);
  });

  it('keeps Tab inside the box', () => {
    const modal = createModal(get('presets', HTMLElement));
    modal.open();
    get('last', HTMLButtonElement).focus();
    const tab = key('Tab');
    get('last', HTMLButtonElement).dispatchEvent(tab);
    expect([tab.defaultPrevented, document.activeElement?.id]).toEqual([true, 'close']);
    const back = key('Tab', { shiftKey: true });
    get('close', HTMLButtonElement).dispatchEvent(back);
    expect(document.activeElement?.id).toBe('last');
  });

  it('is one at a time: opening another closes the first', () => {
    const presets = createModal(get('presets', HTMLElement));
    const help = createModal(get('help', HTMLElement), { close: get('helpClose', HTMLButtonElement) });
    let closed = 0;
    const third = createModal(get('presets', HTMLElement), { onClose: () => closed++ });
    presets.open();
    help.open();
    expect([presets.isOpen(), help.isOpen(), get('presets', HTMLElement).hidden]).toEqual([false, true, true]);
    third.open();
    third.close();
    expect(closed).toBe(1);
  });
});
