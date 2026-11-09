// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { holdToRepeat } from './stepper';

let button: HTMLButtonElement;
let log: string[];

const pointer = (type: string, init: PointerEventInit = {}) =>
  new PointerEvent(type, { bubbles: true, cancelable: true, button: 0, ...init });

beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = '';
  button = document.createElement('button');
  document.body.append(button);
  log = [];
  holdToRepeat(button, { step: () => log.push('step'), end: () => log.push('end') });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('holdToRepeat', () => {
  it('steps once on a press and ends on release: a click is one step', () => {
    button.dispatchEvent(pointer('pointerdown'));
    vi.advanceTimersByTime(200);
    button.dispatchEvent(pointer('pointerup'));
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
    expect(log).toEqual(['step', 'end']);
  });

  it('repeats every 150 ms while held, after a pause of 400 ms, and ends once', () => {
    button.dispatchEvent(pointer('pointerdown'));
    vi.advanceTimersByTime(399);
    expect(log).toEqual(['step']);
    vi.advanceTimersByTime(1);
    expect(log).toEqual(['step', 'step']);
    vi.advanceTimersByTime(450);
    expect(log).toEqual(['step', 'step', 'step', 'step', 'step']);
    button.dispatchEvent(pointer('pointerup'));
    vi.advanceTimersByTime(1000);
    expect(log.filter((e) => e === 'end')).toEqual(['end']);
    expect(log).toHaveLength(6);
  });

  it.each(['pointercancel', 'pointerleave', 'lostpointercapture'])('stops on %s (a scroll took the finger, the pointer left)', (type) => {
    button.dispatchEvent(pointer('pointerdown'));
    vi.advanceTimersByTime(560);
    button.dispatchEvent(pointer(type));
    vi.advanceTimersByTime(1000);
    expect(log).toEqual(['step', 'step', 'step', 'end']);
  });

  it('ignores a release without a press, and buttons but the primary', () => {
    button.dispatchEvent(pointer('pointerup'));
    button.dispatchEvent(pointer('pointerdown', { button: 2 }));
    vi.advanceTimersByTime(1000);
    expect(log).toEqual([]);
  });

  it('steps once and ends on a click with no pointer before it (the keyboard, a screen reader)', () => {
    button.click();
    expect(log).toEqual(['step', 'end']);
  });

  it('keeps the focus where it was: the press does not take it', () => {
    const down = pointer('pointerdown');
    button.dispatchEvent(down);
    expect(down.defaultPrevented).toBe(true);
    button.dispatchEvent(pointer('pointerup'));
  });
});
