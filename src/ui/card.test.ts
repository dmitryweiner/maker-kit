// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import type { Translate } from '../core/message';
import { createCard, restoreCards, snapshotCards } from './card';

const dict = { lid: 'Lid', 'lid.desc': 'A screwed lid', vents: 'Vents' };
type Key = keyof typeof dict;
const t: Translate<Key> = (key) => dict[key];

let root: HTMLElement;

beforeEach(() => {
  document.body.innerHTML = '<div id="root"></div>';
  root = document.getElementById('root') ?? document.body;
});

const head = (id: string) => root.querySelector<HTMLButtonElement>(`#card_${id} .fcard-head`);
const folded = (id: string) => root.querySelector(`#card_${id}`)?.classList.contains('collapsed');

describe('createCard', () => {
  it('draws a head button with the title, the tag and the caret, and a body with the description', () => {
    const card = createCard(root, { id: 'lid', title: 'lid', tag: { text: 'M3' }, desc: 'lid.desc', enabled: true, t });
    const section = root.querySelector('#card_lid');
    expect(section?.className).toBe('fcard on');
    expect(head('lid')?.querySelector('.fcard-title')?.textContent).toBe('Lid');
    expect(head('lid')?.querySelector('.fcard-tag')?.textContent).toBe('M3');
    expect(head('lid')?.getAttribute('aria-expanded')).toBe('true');
    expect(head('lid')?.getAttribute('aria-controls')).toBe('card_lid_body');
    expect(root.querySelector('#card_lid_body .fcard-desc')?.textContent).toBe('A screwed lid');
    expect(card.body.parentElement?.id).toBe('card_lid_body');
  });

  it('starts folded when its feature is off, and folds and unfolds by its head', () => {
    createCard(root, { id: 'vents', title: 'vents', enabled: false, t });
    expect(folded('vents')).toBe(true);
    expect(head('vents')?.getAttribute('aria-expanded')).toBe('false');
    head('vents')?.click();
    expect([folded('vents'), head('vents')?.getAttribute('aria-expanded')]).toEqual([false, 'true']);
    head('vents')?.click();
    expect(folded('vents')).toBe(true);
  });

  it('unfolds when its feature turns on and never folds under the hand when it turns off', () => {
    const card = createCard(root, { id: 'vents', title: 'vents', enabled: false, t });
    card.setEnabled(true);
    expect([folded('vents'), root.querySelector('#card_vents')?.classList.contains('on')]).toEqual([false, true]);
    card.setEnabled(false);
    expect([folded('vents'), root.querySelector('#card_vents')?.classList.contains('on')]).toEqual([false, false]);
    head('vents')?.click();
    card.setEnabled(false);
    expect(folded('vents')).toBe(true);
  });
});

describe('snapshotCards and restoreCards', () => {
  it('keep what was folded by hand across a re-render', () => {
    createCard(root, { id: 'lid', title: 'lid', enabled: true, t });
    createCard(root, { id: 'vents', title: 'vents', enabled: false, t });
    head('lid')?.click();
    head('vents')?.click();
    const snapshot = snapshotCards(root);
    root.replaceChildren();
    createCard(root, { id: 'lid', title: 'lid', enabled: true, t });
    createCard(root, { id: 'vents', title: 'vents', enabled: false, t });
    restoreCards(root, snapshot);
    expect([folded('lid'), folded('vents')]).toEqual([true, false]);
    expect(head('lid')?.getAttribute('aria-expanded')).toBe('false');
  });
});
