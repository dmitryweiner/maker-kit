import { describe, expect, it } from 'vitest';
import { decodeProjectFile, encodeProjectFile, fileSlug, projectFileName } from './projectFile';

interface Box {
  w: number;
  lid: boolean;
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
/** Clamps the width to 10..300 and fills what is missing with defaults. */
const sanitize = (state: unknown): Box => {
  const s = isRecord(state) ? state : {};
  return { w: typeof s.w === 'number' ? Math.min(300, Math.max(10, s.w)) : 50, lid: typeof s.lid === 'boolean' ? s.lid : true };
};
const opts = { app: 'box-maker', version: 2, sanitize };
const throwingSanitize = (): Box => {
  throw new Error('bug');
};
/** an older app's file: the bare state */
const legacy = (data: unknown) => (isRecord(data) && 'w' in data ? sanitize(data) : null);

describe('encodeProjectFile', () => {
  it('writes the app, the version, the name, when it was saved and the state, indented', () => {
    const text = encodeProjectFile({ app: 'box-maker', version: 2, name: 'My box', state: { w: 60, lid: false }, savedAt: new Date(0) });
    expect(JSON.parse(text)).toEqual({
      app: 'box-maker',
      version: 2,
      name: 'My box',
      savedAt: '1970-01-01T00:00:00.000Z',
      state: { w: 60, lid: false },
    });
    expect(text).toContain('\n  "state": {\n    "w": 60');
  });
});

describe('decodeProjectFile', () => {
  it('round-trips the name and the state', () => {
    const text = encodeProjectFile({ ...opts, name: ' My box ', state: { w: 60, lid: false } });
    expect(decodeProjectFile(text, opts)).toEqual({ ok: true, name: 'My box', state: { w: 60, lid: false } });
  });

  it('opens an older version and sanitises the state', () => {
    const text = JSON.stringify({ app: 'box-maker', version: 1, state: { w: 1e6 } });
    expect(decodeProjectFile(text, opts)).toEqual({ ok: true, name: '', state: { w: 300, lid: true } });
  });

  it.each([
    ['not JSON', '{nope'],
    ['empty', ''],
    ['no version', '{"app":"box-maker","state":{}}'],
    ['a version that is not a number', '{"app":"box-maker","version":"2","state":{}}'],
    ['no state', '{"app":"box-maker","version":2}'],
    ['a state that is not an object', '{"app":"box-maker","version":2,"state":[1]}'],
  ])('refuses a broken file: %s', (_, text) => {
    expect(decodeProjectFile(text, opts)).toEqual({ ok: false, reason: 'broken' });
  });

  it.each([
    ['a list', '[]'],
    ['a number', '42'],
    ['random JSON', '{"hello":"world"}'],
    ['another app’s project', '{"app":"case-constructor","version":1,"state":{}}'],
  ])('refuses a file of another app instead of reading defaults over the work: %s', (_, text) => {
    expect(decodeProjectFile(text, opts)).toEqual({ ok: false, reason: 'foreign' });
  });

  it('refuses a file of a newer version', () => {
    expect(decodeProjectFile('{"app":"box-maker","version":3,"state":{}}', opts)).toEqual({ ok: false, reason: 'newer' });
  });

  it('calls a file broken when the sanitiser throws', () => {
    const text = encodeProjectFile({ ...opts, name: 'x', state: {} });
    expect(decodeProjectFile(text, { ...opts, sanitize: throwingSanitize })).toEqual({ ok: false, reason: 'broken' });
  });

  it('opens what `legacy` takes (a bare state of an older app)', () => {
    expect(decodeProjectFile('{"w":70}', { ...opts, legacy })).toEqual({ ok: true, name: '', state: { w: 70, lid: true } });
    expect(decodeProjectFile('{"hello":1}', { ...opts, legacy })).toEqual({ ok: false, reason: 'foreign' });
  });
});

describe('file names', () => {
  it('are a slug of the name, safe in every OS’s paths, letters of any script kept', () => {
    expect(fileSlug('Door sign')).toBe('door-sign');
    expect(fileSlug('Pi 4: desk/case*?')).toBe('pi-4-desk-case');
    expect(fileSlug('Табличка №5')).toBe('табличка-5');
    expect(fileSlug('שלט לדלת')).toBe('שלט-לדלת');
  });

  it('fall back to a word of the app’s for a name with nothing to keep', () => {
    expect(fileSlug('  ')).toBe('project');
    expect(fileSlug('***', 'plate')).toBe('plate');
    expect(projectFileName('', 'plate.json', 'plate')).toBe('plate.plate.json');
    expect(projectFileName('Door sign', 'plate.json')).toBe('door-sign.plate.json');
  });
});
