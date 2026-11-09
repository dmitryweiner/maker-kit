// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { el, make } from './dom';

beforeEach(() => {
  document.body.innerHTML = '<button id="go">Go</button><div id="box"></div>';
});

describe('el', () => {
  it('finds an element by id, typed by its constructor', () => {
    const button: HTMLButtonElement = el('go', HTMLButtonElement);
    expect(button.textContent).toBe('Go');
  });

  it('throws on a missing id or another kind of element', () => {
    expect(() => el('nope', HTMLElement)).toThrow('#nope');
    expect(() => el('box', HTMLButtonElement)).toThrow('#box');
  });
});

describe('make', () => {
  it('makes an element with a class and a text', () => {
    const p = make('p', 'row-note', 'M3 × 8');
    expect([p.tagName, p.className, p.textContent]).toEqual(['P', 'row-note', 'M3 × 8']);
    expect(make('span').className).toBe('');
  });
});
