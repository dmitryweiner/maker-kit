import { describe, expect, it } from 'vitest';
import { isMessage, labelText, messageText, type Translate } from './message';

const t: Translate<'a' | 'b'> = (key, params) => `${key}${params ? JSON.stringify(params) : ''}`;

describe('isMessage', () => {
  it('takes a code with or without parameters of strings and numbers', () => {
    expect(isMessage({ code: 'kit.mesh.open' })).toBe(true);
    expect(isMessage({ code: 'warn.x', params: { n: 2, name: 'M3' } })).toBe(true);
  });

  it.each([null, 'kit.mesh.open', [], {}, { code: '' }, { code: 3 }, { code: 'a', params: [] }, { code: 'a', params: { n: {} } }])(
    'refuses what came through postMessage broken: %j',
    (value) => {
      expect(isMessage(value)).toBe(false);
    },
  );
});

describe('labelText', () => {
  it('translates a key and keeps ready text as it is', () => {
    expect(labelText('a', t)).toBe('a');
    expect(labelText({ text: 'USB-C' }, t)).toBe('USB-C');
  });
});

describe('messageText', () => {
  it('translates the code with its parameters', () => {
    expect(messageText({ code: 'b', params: { n: 1 } }, t)).toBe('b{"n":1}');
  });
});
