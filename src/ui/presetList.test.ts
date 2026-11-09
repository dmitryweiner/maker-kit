// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { format } from '../core/format';
import type { Translate } from '../core/message';
import type { PresetRef } from '../core/presets';
import { kitEn, kitRu } from '../i18n/index';
import { renderPresetList, type PresetListOptions } from './presetList';

let dict: Record<keyof typeof kitEn, string> = kitEn;
const t: Translate<keyof typeof kitEn> = (key, params) => format(dict[key], params, 'en');

let root: HTMLElement;
let log: string[];

const options = (o: Partial<PresetListOptions> = {}): PresetListOptions => ({
  builtIn: [
    { id: 'pi', label: 'Raspberry Pi 4 desktop', note: 'Ports in the back wall' },
    { id: 'esp', label: 'ESP32 sensor box' },
  ],
  user: [
    { id: 'u1', name: 'My box' },
    { id: 'u3', name: 'Box 2' },
  ],
  current: '',
  status: 'none',
  t,
  open: (ref: PresetRef) => log.push(`open ${ref}`),
  rename: (id, name) => log.push(`rename ${id} ${name}`),
  remove: (id) => log.push(`remove ${id}`),
  ...o,
});

const rows = () => [...root.querySelectorAll<HTMLElement>('.preset-row')];
const row = (ref: string) => root.querySelector<HTMLElement>(`.preset-row[data-ref="${ref}"]`);
const remove = () => row('u:u3')?.querySelector<HTMLButtonElement>('.preset-delete');

beforeEach(() => {
  vi.useFakeTimers();
  dict = kitEn;
  log = [];
  document.body.innerHTML = '<div id="list"></div>';
  root = document.getElementById('list') ?? document.body;
});

afterEach(() => {
  vi.useRealTimers();
});

describe('renderPresetList', () => {
  it('groups the user’s presets first, then the built-in ones with their notes', () => {
    renderPresetList(root, options());
    expect([...root.querySelectorAll('.preset-group')].map((h) => h.textContent)).toEqual(['My presets', 'Built-in']);
    expect(rows().map((r) => r.dataset.ref)).toEqual(['u:u1', 'u:u3', 'b:pi', 'b:esp']);
    expect(row('b:pi')?.querySelector('.preset-note')?.textContent).toBe('Ports in the back wall');
    expect(row('b:esp')?.querySelector('.preset-note')).toBeNull();
  });

  it('says how to get a preset of one’s own when there is none', () => {
    renderPresetList(root, options({ user: [] }));
    expect(root.querySelector('.preset-empty')?.textContent).toBe(kitEn['kit.preset.none']);
  });

  it('opens a built-in preset by its row and a user one by its button', () => {
    renderPresetList(root, options());
    row('b:esp')?.querySelector<HTMLButtonElement>('.preset-pick')?.click();
    const open = row('u:u3')?.querySelector<HTMLButtonElement>('.preset-open');
    expect(open?.getAttribute('aria-label')).toBe('Open');
    open?.click();
    expect(log).toEqual(['open b:esp', 'open u:u3']);
  });

  it('marks the open preset as current, and changed once the project differs', () => {
    renderPresetList(root, options({ current: 'b:pi', status: 'same' }));
    expect(row('b:pi')?.querySelector('.preset-pick')?.getAttribute('aria-current')).toBe('true');
    expect(row('b:pi')?.querySelector('.preset-changed')).toBeNull();
    renderPresetList(root, options({ current: 'u:u1', status: 'changed' }));
    expect(row('b:pi')?.querySelector('.preset-pick')?.getAttribute('aria-current')).toBeNull();
    expect(row('u:u1')?.classList.contains('current')).toBe(true);
    expect(row('u:u1')?.querySelector('.preset-changed')?.textContent).toBe('changed');
  });

  it('renames a user preset in place when its field changes', () => {
    renderPresetList(root, options());
    const field = row('u:u1')?.querySelector('input');
    if (!field) throw new Error('no field');
    expect([field.value, field.maxLength, field.getAttribute('aria-label')]).toEqual(['My box', 60, 'Name of the preset']);
    field.value = 'Lid test';
    field.dispatchEvent(new Event('change'));
    expect(log).toEqual(['rename u1 Lid test']);
  });

  it('deletes in two taps: 🗑, then “Delete?” for 3 s', () => {
    renderPresetList(root, options());
    expect(remove()?.getAttribute('aria-label')).toBe('Delete “Box 2”');
    remove()?.click();
    expect([remove()?.textContent, remove()?.classList.contains('danger'), log]).toEqual(['Delete?', true, []]);
    vi.advanceTimersByTime(3000);
    expect([remove()?.textContent, remove()?.classList.contains('danger')]).toEqual(['🗑', false]);
    remove()?.click();
    remove()?.click();
    expect(log).toEqual(['remove u3']);
  });

  it('is not drawn again for the same list: a field being typed in keeps its focus', () => {
    renderPresetList(root, options());
    const field = row('u:u1')?.querySelector('input');
    field?.focus();
    renderPresetList(root, options());
    expect(document.activeElement).toBe(field);
  });

  it('is drawn again in another language', () => {
    renderPresetList(root, options());
    dict = kitRu;
    renderPresetList(root, options());
    expect(root.querySelector('.preset-group')?.textContent).toBe('Мои пресеты');
  });
});
