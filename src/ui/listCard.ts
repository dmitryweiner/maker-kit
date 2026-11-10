// A group of items, each with controls of its own (Plate Builder's texts,
// images and holes; Case Constructor's labels and openings): a row per
// item, its head — the name, a hint (a text's first line), a visibility
// switch, duplicate, delete — and under it the item's controls.
//
// Two shapes. With `select`, the heads fold: one item is open and holds the
// app's controls node (Plate Builder moves one node into the selected
// item). Without it, every item shows its own controls (Case Constructor's
// boxes). Delete acts at once: undo brings the item back.
//
// The card's heading, its count ("Texts · 2 / 10") and the add button are
// the app's markup. Rows are made again only when the items, their names,
// visibility or the open one change: a click that blurs a field (whose
// change re-renders) must find its button on mouseup, and a text field in a
// row keeps its focus. A hint follows the typing in place. Moved out of a
// row made again, the app's controls node is the app's to park.

import type { Translate } from '../core/message';
import type { KitKey } from '../i18n/index';
import { make } from './dom';

export interface ListItem {
  id: string;
  title: string;
  /** after the name: a text's first line, a hole's kind */
  hint?: string;
  icon?: string;
  /** absent: the item has no visibility switch */
  visible?: boolean;
}

export interface ItemListOptions {
  items: readonly ListItem[];
  /** the unfolded item, with `select` */
  open?: string | null;
  /** an item's controls, moved into its row; null: none shown */
  body(id: string): HTMLElement | null;
  t: Translate<KitKey>;
  /** ids: the row `<prefix>_<id>`, its buttons `_visible`, `_duplicate`, `_remove` */
  idPrefix: string;
  /** the heads fold: a click opens an item, on the open one closes it (null) */
  select?(id: string | null): void;
  toggle?(id: string): void;
  duplicate?(id: string): void;
  remove(id: string): void;
}

const drawn = new WeakMap<HTMLElement, { key: string; o: ItemListOptions }>();

export function renderItemList(list: HTMLElement, o: ItemListOptions): void {
  const key = JSON.stringify([
    o.items.map(({ id, title, icon, visible }) => [id, title, icon, visible]),
    o.select ? (o.open ?? null) : '',
    o.idPrefix,
    !!o.toggle,
    !!o.duplicate,
    o.t('kit.list.visible'),
    o.t('kit.list.duplicate'),
    o.t('kit.list.remove'),
  ]);
  const last = drawn.get(list);
  drawn.set(list, { key, o });
  // the buttons ask for the latest options, so the same rows act on fresh ones
  const now = (): ItemListOptions => drawn.get(list)?.o ?? o;
  if (last?.key === key) {
    const hints = new Map(o.items.map((item) => [item.id, item.hint ?? '']));
    for (const row of list.querySelectorAll<HTMLElement>('.item-row')) {
      const hint = row.querySelector('.item-hint');
      const text = hints.get(row.dataset.id ?? '');
      if (hint && text !== undefined && hint.textContent !== text) hint.textContent = text;
    }
    return;
  }

  list.replaceChildren(
    ...o.items.map((item) => {
      const folds = o.select !== undefined;
      const open = folds && item.id === o.open;
      const id = `${o.idPrefix}_${item.id}`;
      const row = make('li', 'item-row');
      row.id = id;
      row.dataset.id = item.id;
      row.classList.toggle('open', open);
      row.classList.toggle('hidden-item', item.visible === false);

      const head = make('div', 'item-head');
      const name = folds ? make('button', 'item-name') : make('span', 'item-name');
      if (name instanceof HTMLButtonElement) {
        name.type = 'button';
        name.setAttribute('aria-expanded', String(open));
        name.append(make('span', 'item-caret', open ? '▾' : '▸'));
        name.addEventListener('click', () => now().select?.(open ? null : item.id));
      }
      if (item.icon !== undefined) name.append(make('span', 'item-icon', item.icon));
      name.append(make('span', 'item-title', item.title));
      if (item.hint !== undefined) name.append(make('span', 'item-hint', item.hint));
      head.append(name);

      const named = (label: KitKey): string => `${o.t(label)}: ${item.title}`;
      if (o.toggle && item.visible !== undefined) {
        const eye = make('input', 'item-visible');
        eye.type = 'checkbox';
        eye.id = `${id}_visible`;
        eye.checked = item.visible;
        eye.title = o.t('kit.list.visible');
        eye.setAttribute('aria-label', named('kit.list.visible'));
        eye.addEventListener('change', () => now().toggle?.(item.id));
        head.append(eye);
      }
      const button = (suffix: string, icon: string, label: KitKey, act: () => void): void => {
        const b = make('button', 'icon-button', icon);
        b.type = 'button';
        b.id = `${id}_${suffix}`;
        b.title = o.t(label);
        b.setAttribute('aria-label', named(label));
        b.addEventListener('click', act);
        head.append(b);
      };
      if (o.duplicate) button('duplicate', '⧉', 'kit.list.duplicate', () => now().duplicate?.(item.id));
      button('remove', '✕', 'kit.list.remove', () => now().remove(item.id));
      row.append(head);

      const body = folds && !open ? null : o.body(item.id);
      if (body) {
        body.hidden = false;
        row.append(body);
      }
      return row;
    }),
  );
}
