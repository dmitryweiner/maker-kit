// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import type { Translate } from '../core/message';
import { kitEn, type KitKey } from '../i18n/index';
import { renderItemList, type ItemListOptions, type ListItem } from './listCard';

const t: Translate<KitKey> = (key) => kitEn[key];

let list: HTMLUListElement;
beforeEach(() => {
  document.body.innerHTML = '<ul id="texts" class="item-list"></ul>';
  const found = document.getElementById('texts');
  if (!(found instanceof HTMLUListElement)) throw new Error('no list');
  list = found;
});

const rows = () => [...list.querySelectorAll<HTMLElement>('.item-row')];
const calls: string[] = [];
beforeEach(() => {
  calls.length = 0;
});

/** Plate Builder's shape: one item open with the app's controls, visibility, duplicate, delete. */
function accordion(items: readonly ListItem[], open: string | null, body: HTMLElement): ItemListOptions {
  return {
    items,
    open,
    body: (id) => (id === open ? body : null),
    t,
    idPrefix: 'text',
    select: (id) => calls.push(`select ${id}`),
    toggle: (id) => calls.push(`toggle ${id}`),
    duplicate: (id) => calls.push(`duplicate ${id}`),
    remove: (id) => calls.push(`remove ${id}`),
  };
}

const texts: ListItem[] = [
  { id: 't1', title: 'Text 1', hint: 'Hello', icon: 'T', visible: true },
  { id: 't2', title: 'Text 2', hint: 'World', icon: 'T', visible: false },
];

describe('renderItemList as an accordion', () => {
  it('draws a row per item: the head folds, the open one holds the app’s controls', () => {
    const body = document.createElement('div');
    renderItemList(list, accordion(texts, 't2', body));
    expect(rows().map((row) => row.id)).toEqual(['text_t1', 'text_t2']);
    expect(rows().map((row) => row.dataset.id)).toEqual(['t1', 't2']);
    expect(rows()[1]?.classList.contains('open')).toBe(true);
    expect(rows()[1]?.lastElementChild).toBe(body);
    expect(rows()[0]?.contains(body)).toBe(false);
    const heads = rows().map((row) => row.querySelector('.item-name'));
    expect(heads.map((head) => head?.getAttribute('aria-expanded'))).toEqual(['false', 'true']);
    expect(heads[0]?.textContent).toBe('▸TText 1Hello');
    expect(rows()[0]?.querySelector('.item-hint')?.textContent).toBe('Hello');
    heads[0]?.dispatchEvent(new MouseEvent('click'));
    heads[1]?.dispatchEvent(new MouseEvent('click'));
    expect(calls).toEqual(['select t1', 'select null']);
  });

  it('a hidden item is marked; visibility, duplicate and delete name the item for a screen reader', () => {
    renderItemList(list, accordion(texts, null, document.createElement('div')));
    expect(rows()[1]?.classList.contains('hidden-item')).toBe(true);
    const eye = list.querySelector<HTMLInputElement>('#text_t2_visible');
    expect(eye?.type).toBe('checkbox');
    expect(eye?.checked).toBe(false);
    expect(eye?.getAttribute('aria-label')).toBe('Visible: Text 2');
    eye?.dispatchEvent(new Event('change'));
    const copy = list.querySelector<HTMLButtonElement>('#text_t2_duplicate');
    expect(copy?.getAttribute('aria-label')).toBe('Duplicate: Text 2');
    expect(copy?.title).toBe('Duplicate');
    copy?.click();
    const remove = list.querySelector<HTMLButtonElement>('#text_t1_remove');
    expect(remove?.getAttribute('aria-label')).toBe('Delete: Text 1');
    remove?.click();
    expect(calls).toEqual(['toggle t2', 'duplicate t2', 'remove t1']);
  });

  it('the same items are not drawn again: a field keeps its focus, a click finds its button; a hint follows in place', () => {
    const body = document.createElement('div');
    renderItemList(list, accordion(texts, 't1', body));
    const first = rows()[0];
    renderItemList(list, accordion([{ ...texts[0]!, hint: 'Hello, wor' }, texts[1]!], 't1', body));
    expect(rows()[0]).toBe(first);
    expect(first?.querySelector('.item-hint')?.textContent).toBe('Hello, wor');
    renderItemList(list, accordion([texts[0]!], 't1', body));
    expect(rows()).toHaveLength(1);
    expect(rows()[0]).not.toBe(first);
  });

  it('the buttons act with the latest options', () => {
    const body = document.createElement('div');
    renderItemList(list, { ...accordion(texts, null, body), remove: () => calls.push('old') });
    renderItemList(list, accordion(texts, null, body));
    list.querySelector<HTMLButtonElement>('#text_t1_remove')?.click();
    expect(calls).toEqual(['remove t1']);
  });
});

describe('renderItemList with every item open', () => {
  it('Case Constructor’s labels: no folding, no visibility, no duplicate — a title, ✕ and the controls of each', () => {
    const boxes = new Map(['l0', 'l1'].map((id) => [id, document.createElement('div')]));
    renderItemList(list, {
      items: [
        { id: 'l0', title: 'Label 1' },
        { id: 'l1', title: 'Label 2' },
      ],
      body: (id) => boxes.get(id) ?? null,
      t,
      idPrefix: 'label',
      remove: (id) => calls.push(`remove ${id}`),
    });
    expect(rows().map((row) => row.lastElementChild)).toEqual([boxes.get('l0'), boxes.get('l1')]);
    expect(list.querySelector('button.item-name')).toBeNull();
    expect(list.querySelector('.item-name')?.textContent).toBe('Label 1');
    expect(list.querySelector('[aria-expanded]')).toBeNull();
    expect(list.querySelector('.item-visible')).toBeNull();
    expect(list.querySelector('[id$="_duplicate"]')).toBeNull();
    list.querySelector<HTMLButtonElement>('#label_l1_remove')?.click();
    expect(calls).toEqual(['remove l1']);
  });

  it('draws again when the language changes', () => {
    const o = { items: [{ id: 'a', title: 'A' }], body: () => null, t, idPrefix: 'x', remove: () => {} };
    renderItemList(list, o);
    const row = rows()[0];
    renderItemList(list, { ...o, t: (key: KitKey) => (key === 'kit.list.remove' ? 'Удалить' : kitEn[key]) });
    expect(rows()[0]).not.toBe(row);
    expect(list.querySelector('#x_a_remove')?.getAttribute('aria-label')).toBe('Удалить: A');
  });
});
