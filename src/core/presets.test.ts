import { describe, expect, it } from 'vitest';
import {
  addUserPreset,
  isPresetRef,
  nextPresetName,
  overlay,
  presetRef,
  presetStatus,
  readUserPresets,
  removeUserPreset,
  renameUserPreset,
  type PresetRef,
  type UserPreset,
} from './presets';

interface Box {
  w: number;
  view: 'iso' | 'top';
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const sanitize = (state: unknown): Box => {
  const s = isRecord(state) ? state : {};
  return { w: typeof s.w === 'number' ? s.w : 50, view: s.view === 'top' ? 'top' : 'iso' };
};

describe('overlay', () => {
  it('merges objects key by key, anything else replaces', () => {
    const base = { shape: { kind: 'box', wall: 2, size: { w: 60, h: 40 } }, ports: [1, 2], name: 'x' };
    const over = { shape: { wall: 3, size: { h: 50 } }, ports: [7] };
    expect(overlay(base, over)).toEqual({ shape: { kind: 'box', wall: 3, size: { w: 60, h: 50 } }, ports: [7], name: 'x' });
  });

  it('leaves the base untouched', () => {
    const base = { a: { b: 1 } };
    overlay(base, { a: { b: 2 } });
    expect(base).toEqual({ a: { b: 1 } });
  });
});

describe('readUserPresets', () => {
  it('keeps what is readable and sanitises each state', () => {
    const stored = [
      { id: 'u1', name: ' Mine ', state: { w: 70 } },
      'junk',
      { id: 'u2', name: 'No state' },
      { id: 'u3', name: 'Wide', state: { w: 'x' } },
    ];
    expect(readUserPresets(stored, sanitize)).toEqual([
      { id: 'u1', name: 'Mine', state: { w: 70, view: 'iso' } },
      { id: 'u3', name: 'Wide', state: { w: 50, view: 'iso' } },
    ]);
  });

  it('gives an empty list for anything but a list', () => {
    expect(readUserPresets({ id: 'u1' }, sanitize)).toEqual([]);
    expect(readUserPresets(null, sanitize)).toEqual([]);
  });

  it('gives a missing, broken or repeated id a free one, and a nameless preset its id', () => {
    const stored = [
      { id: 'u2', name: 'a', state: {} },
      { id: 'u2', name: 'b', state: {} },
      { id: 7, name: 'c', state: {} },
      { name: '', state: {} },
    ];
    expect(readUserPresets(stored, sanitize).map((p) => [p.id, p.name])).toEqual([
      ['u2', 'a'],
      ['u3', 'b'],
      ['u4', 'c'],
      ['u5', 'u5'],
    ]);
  });

  it('cuts a name to 60 characters', () => {
    const [preset] = readUserPresets([{ id: 'u1', name: 'x'.repeat(80), state: {} }], sanitize);
    expect(preset?.name).toHaveLength(60);
  });
});

describe('adding, renaming, removing', () => {
  const list: UserPreset<Box>[] = [
    { id: 'u1', name: 'One', state: { w: 1, view: 'iso' } },
    { id: 'u4', name: 'Four', state: { w: 4, view: 'iso' } },
  ];

  it('adds with the next id, stable across renames and removals', () => {
    const added = addUserPreset(list, '  Five ', { w: 5, view: 'top' });
    expect(added.id).toBe('u5');
    expect(added.list.at(-1)).toEqual({ id: 'u5', name: 'Five', state: { w: 5, view: 'top' } });
    expect(addUserPreset([], 'First', { w: 1, view: 'iso' }).id).toBe('u1');
    expect(list).toHaveLength(2);
  });

  it('renames in place; an empty name changes nothing', () => {
    expect(renameUserPreset(list, 'u4', ' Four mm ').map((p) => p.name)).toEqual(['One', 'Four mm']);
    expect(renameUserPreset(list, 'u4', '   ')).toEqual(list);
    expect(renameUserPreset(list, 'u4', 'y'.repeat(99))[1]?.name).toHaveLength(60);
  });

  it('removes by id', () => {
    expect(removeUserPreset(list, 'u1').map((p) => p.id)).toEqual(['u4']);
    expect(removeUserPreset(list, 'u9')).toEqual(list);
  });
});

describe('nextPresetName', () => {
  it('counts across the prefixes of every language', () => {
    const list = [{ name: 'Case 2' }, { name: 'Корпус 5' }, { name: 'Case 2b' }, { name: 'Casement 9' }];
    expect(nextPresetName(list, ['Case', 'Корпус', 'מארז'], 'Case')).toBe('Case 6');
    expect(nextPresetName([], ['Case'], 'מארז')).toBe('מארז 1');
  });
});

describe('preset refs', () => {
  it('make and tell a built-in, a user preset, or none', () => {
    expect(presetRef('b', 'door-sign')).toBe('b:door-sign');
    expect(presetRef('u', 'u3')).toBe('u:u3');
    for (const ref of ['b:door-sign', 'u:u3', '']) expect(isPresetRef(ref)).toBe(true);
    for (const ref of ['b:', 'x:1', 'door-sign', 3, null]) expect(isPresetRef(ref)).toBe(false);
  });
});

describe('presetStatus', () => {
  const presets: Record<string, Box> = { 'b:wide': { w: 200, view: 'iso' } };
  const find = (ref: PresetRef) => presets[ref];
  /** the view does not make a project different */
  const signature = (s: Box) => JSON.stringify({ ...s, view: null });

  it('is none with no preset open or one that is gone', () => {
    expect(presetStatus('', { w: 200, view: 'iso' }, find, signature)).toBe('none');
    expect(presetStatus('u:u9', { w: 200, view: 'iso' }, find, signature)).toBe('none');
  });

  it('is the same until the project differs by its signature', () => {
    expect(presetStatus('b:wide', { w: 200, view: 'top' }, find, signature)).toBe('same');
    expect(presetStatus('b:wide', { w: 201, view: 'iso' }, find, signature)).toBe('changed');
  });
});
