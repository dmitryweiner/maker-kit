// A card of the panel that folds (Case Constructor's): a head button with
// its title, an optional tag and a caret; a body with a description and the
// rows. It unfolds when its feature turns on and never folds under the
// hand — turning a feature off happens inside the open card. Which cards
// are folded survives a re-render (a language switch) by a snapshot.

import type { Label, Translate } from '../core/message';
import { labelText } from '../core/message';
import { make } from './dom';

export interface CardOptions<K extends string> {
  /** the card is `#card_<id>`, its body `#card_<id>_body` */
  id: string;
  title: K;
  tag?: Label<K>;
  desc?: K;
  /** whether its feature is on: an off card starts folded */
  enabled: boolean;
  t: Translate<K>;
}

export interface CardHandle {
  card: HTMLElement;
  /** where the rows go */
  body: HTMLElement;
  setEnabled(on: boolean): void;
}

export function createCard<K extends string>(container: HTMLElement, o: CardOptions<K>): CardHandle {
  const card = make('section', 'fcard');
  card.id = `card_${o.id}`;
  const head = make('button', 'fcard-head');
  head.type = 'button';
  head.setAttribute('aria-controls', `${card.id}_body`);
  head.append(make('span', 'fcard-title', o.t(o.title)));
  if (o.tag) head.append(make('span', 'fcard-tag', labelText(o.tag, o.t)));
  const caret = make('span', 'fcard-caret', '▾');
  caret.setAttribute('aria-hidden', 'true');
  head.append(caret);

  const body = make('div', 'fcard-body');
  body.id = `${card.id}_body`;
  if (o.desc) body.append(make('p', 'fcard-desc', o.t(o.desc)));
  const rows = make('div');
  body.append(rows);

  card.append(head, body);
  container.append(card);
  card.classList.toggle('on', o.enabled);
  fold(card, !o.enabled);
  head.addEventListener('click', () => fold(card, !card.classList.contains('collapsed')));

  let enabled = o.enabled;
  return {
    card,
    body: rows,
    setEnabled(on) {
      card.classList.toggle('on', on);
      if (on && !enabled) fold(card, false);
      enabled = on;
    },
  };
}

function fold(card: Element, collapsed: boolean): void {
  card.classList.toggle('collapsed', collapsed);
  card.querySelector(':scope > .fcard-head')?.setAttribute('aria-expanded', String(!collapsed));
}

/** Which cards are folded, by id: taken before a re-render, given back after it. */
export function snapshotCards(root: ParentNode): Map<string, boolean> {
  const collapsed = new Map<string, boolean>();
  for (const card of root.querySelectorAll('.fcard')) collapsed.set(card.id, card.classList.contains('collapsed'));
  return collapsed;
}

export function restoreCards(root: ParentNode, collapsed: ReadonlyMap<string, boolean>): void {
  for (const card of root.querySelectorAll('.fcard')) {
    const value = collapsed.get(card.id);
    if (value !== undefined) fold(card, value);
  }
}
