// A button that repeats while held: the − and + beside a slider. A press
// steps at once; held past a pause, it steps every 150 ms; the release ends
// the run once — so a click, and a whole hold, is one undo step (`step`
// gives live changes, `end` the final one). The pause keeps a slow click
// one step. The press does not take the focus: the slider keeps it, and
// Ctrl+Z after a hold undoes the hold.

import { browserTimers, type Timers } from './timers';

export interface HoldOptions {
  step(): void;
  end(): void;
  timers?: Timers;
  /** how long a press is held before it repeats */
  delayMs?: number;
  repeatMs?: number;
}

export function holdToRepeat(button: HTMLButtonElement, o: HoldOptions): void {
  const timers = o.timers ?? browserTimers;
  const delayMs = o.delayMs ?? 400;
  const repeatMs = o.repeatMs ?? 150;
  let timer: number | null = null;
  let held = false;

  const repeat = (ms: number): void => {
    timer = timers.set(() => {
      o.step();
      repeat(repeatMs);
    }, ms);
  };
  const release = (): void => {
    if (!held) return;
    held = false;
    if (timer !== null) timers.clear(timer);
    timer = null;
    o.end();
  };

  button.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || button.disabled) return;
    event.preventDefault();
    try {
      // the release reaches the button even off it; jsdom has no capture
      button.setPointerCapture(event.pointerId);
    } catch {
      // no capture: pointerleave ends the run instead
    }
    held = true;
    o.step();
    repeat(delayMs);
  });
  for (const type of ['pointerup', 'pointercancel', 'pointerleave', 'lostpointercapture']) button.addEventListener(type, release);
  // a click of the keyboard or a screen reader counts no clicks (detail 0);
  // the one after a press is the press's own, already stepped
  button.addEventListener('click', (event) => {
    if (event.detail !== 0) return;
    o.step();
    o.end();
  });
}
