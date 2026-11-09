// The presets dialog's list (Plate Builder's and Case Constructor's): the
// user's presets first — a name field (renamed on change), open, delete in
// two taps — then the built-in ones by their translated names and notes.
// The open preset is marked current, and "changed" once the project differs
// from it. No `confirm()`: 🗑 turns into "Delete?" for 3 s.
//
// The same list is not drawn again, so a name being typed keeps its focus
// and the list its scroll; a language switch or a change of the list is.

import type { Translate } from '../core/message';
import type { PresetRef, PresetStatus } from '../core/presets';
import { PRESET_NAME_CHARS, presetRef } from '../core/presets';
import type { KitKey } from '../i18n/index';
import { make } from './dom';
import { browserTimers, type Timers } from './timers';

export const CONFIRM_MS = 3000;

export interface PresetListOptions {
  /** names and notes already translated (`preset.<id>.name`, `.note`) */
  builtIn: readonly { id: string; label: string; note?: string }[];
  user: readonly { id: string; name: string }[];
  current: PresetRef;
  status: PresetStatus;
  t: Translate<KitKey>;
  open(ref: PresetRef): void;
  rename(id: string, name: string): void;
  remove(id: string): void;
  timers?: Timers;
}

const drawn = new WeakMap<HTMLElement, string>();

export function renderPresetList(root: HTMLElement, o: PresetListOptions): void {
  const key = JSON.stringify([o.builtIn, o.user, o.current, o.status, o.t('kit.preset.mine'), o.t('kit.preset.changed')]);
  if (drawn.get(root) === key) return;
  drawn.set(root, key);
  const scroller = root.parentElement ?? root;
  const scroll = scroller.scrollTop;
  const timers = o.timers ?? browserTimers;

  const changed = (): HTMLElement[] => (o.status === 'changed' ? [make('span', 'preset-changed', o.t('kit.preset.changed'))] : []);
  const item = (ref: PresetRef): HTMLLIElement => {
    const li = make('li', 'preset-row');
    li.dataset.ref = ref;
    if (ref === o.current) li.classList.add('current');
    return li;
  };

  const mine = make('ul', 'preset-list');
  for (const preset of o.user) {
    const ref = presetRef('u', preset.id);
    const li = item(ref);
    const field = make('input', 'field');
    field.type = 'text';
    field.value = preset.name;
    field.maxLength = PRESET_NAME_CHARS;
    field.dir = 'auto';
    field.setAttribute('aria-label', o.t('kit.preset.rename'));
    field.addEventListener('change', () => o.rename(preset.id, field.value));
    const open = make('button', 'icon-button preset-open', '↗');
    open.type = 'button';
    open.title = o.t('kit.preset.open');
    open.setAttribute('aria-label', o.t('kit.preset.open'));
    open.addEventListener('click', () => o.open(ref));
    li.append(field, ...(ref === o.current ? changed() : []), open, deleteButton(preset, o, timers));
    mine.append(li);
  }

  const builtIn = make('ul', 'preset-list');
  for (const preset of o.builtIn) {
    const ref = presetRef('b', preset.id);
    const li = item(ref);
    const pick = make('button', 'preset-pick');
    pick.type = 'button';
    if (ref === o.current) pick.setAttribute('aria-current', 'true');
    const name = make('span', 'preset-name', preset.label);
    if (ref === o.current && o.status === 'changed') name.append(' · ', ...changed());
    pick.append(name);
    if (preset.note) pick.append(make('span', 'preset-note', preset.note));
    pick.addEventListener('click', () => o.open(ref));
    li.append(pick);
    builtIn.append(li);
  }

  root.replaceChildren(
    make('h3', 'preset-group', o.t('kit.preset.mine')),
    o.user.length > 0 ? mine : make('p', 'preset-empty', o.t('kit.preset.none')),
    make('h3', 'preset-group', o.t('kit.preset.builtIn')),
    builtIn,
  );
  scroller.scrollTop = scroll;
}

/** 🗑, then "Delete?" in the bad colour for 3 s: a second tap removes. */
function deleteButton(preset: { id: string; name: string }, o: PresetListOptions, timers: Timers): HTMLButtonElement {
  const button = make('button');
  button.type = 'button';
  let armed: number | null = null;
  const show = (): void => {
    const asking = armed !== null;
    button.className = asking ? 'btn danger preset-delete' : 'icon-button preset-delete';
    button.textContent = asking ? o.t('kit.preset.confirm') : '🗑';
  };
  button.setAttribute('aria-label', o.t('kit.preset.delete', { name: preset.name }));
  button.title = o.t('kit.preset.delete', { name: preset.name });
  button.addEventListener('click', () => {
    if (armed !== null) {
      timers.clear(armed);
      armed = null;
      o.remove(preset.id);
      return;
    }
    armed = timers.set(() => {
      armed = null;
      show();
    }, CONFIRM_MS);
    show();
  });
  show();
  return button;
}
