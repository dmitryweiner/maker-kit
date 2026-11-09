// The bar over the view (Case Constructor's bar and Plate Builder's view bar
// in one). One bar for any number of jobs: it shows while any tracked job
// runs and hides when the last one ends. It appears only once a job has run
// 300 ms, so a quick preview never flickers it; a job asked for with a
// button (an export) shows it at once. A running stripe when nothing says
// how much is done; the share done when the job reports steps. Text only for
// a labelled job, translated when drawn — the language may change mid-job.
// The previous result stays under it; it takes no pointer events (CSS).

import type { Message, Translate } from '../core/message';
import type { JobProgress } from '../core/progress';
import type { KitKey } from '../i18n/index';
import { make } from './dom';
import { browserTimers, type Timers } from './timers';

export const SHOW_DELAY_MS = 300;

export interface TrackOptions<K extends string> {
  /** text over the bar: a key or a message; none for a preview */
  label?: K | Message<K>;
  /** 0: show at once (an export asked for with a button) */
  delayMs?: number;
}

/** A promise, or a function that gets a progress callback and gives one. */
export type Job<R, K extends string> = Promise<R> | ((onProgress: (progress: JobProgress<K>) => void) => Promise<R>);

export interface ProgressHandle<K extends string> {
  /** Shows the bar while `job` runs; settles as the job does. Labels may be the kit's keys too. */
  track<R>(job: Job<R, K | KitKey>, o?: TrackOptions<K | KitKey>): Promise<R>;
  /** draws the text again — after a language switch */
  refresh(): void;
  dispose(): void;
}

interface Tracker<K extends string> {
  label: Message<K | KitKey> | null;
  step: number | null;
  total: number | null;
  visible: boolean;
}

export function createProgress<K extends string>(
  wrap: HTMLElement,
  /** K: the app's keys, read from its translate function */
  o: { t: Translate<K | KitKey>; timers?: Timers },
): ProgressHandle<K> {
  const timers = o.timers ?? browserTimers;
  const label = make('div', 'progress-label');
  const track = make('div', 'progress-track running');
  const fill = make('div', 'progress-fill');
  track.setAttribute('role', 'progressbar');
  track.append(fill);
  wrap.replaceChildren(label, track);
  wrap.hidden = true;

  const active: Tracker<K>[] = [];
  const reveals = new Set<number>();
  let hideTimer: number | null = null;
  let disposed = false;

  const hide = (): void => {
    hideTimer = null;
    if (active.some((tracker) => tracker.visible)) return;
    wrap.hidden = true;
  };

  function render(): void {
    if (disposed) return;
    const shown = active.findLast((tracker) => tracker.visible);
    if (!shown) {
      // a job ending and the next starting at once must not blink the bar: hide a moment later
      if (hideTimer === null && !wrap.hidden) hideTimer = timers.set(hide, 0);
      return;
    }
    if (hideTimer !== null) timers.clear(hideTimer);
    hideTimer = null;
    wrap.hidden = false;
    const text = shown.label ? o.t(shown.label.code, shown.label.params) : '';
    label.hidden = !text;
    label.textContent = text;
    track.setAttribute('aria-label', text || o.t('kit.progress.building'));
    const stepped = shown.step !== null && shown.total !== null && shown.total > 0;
    track.classList.toggle('running', !stepped);
    if (stepped) {
      const share = Math.round((100 * Math.min(shown.step ?? 0, shown.total ?? 1)) / (shown.total ?? 1));
      fill.style.inlineSize = `${share}%`;
      track.setAttribute('aria-valuemin', '0');
      track.setAttribute('aria-valuemax', '100');
      track.setAttribute('aria-valuenow', String(share));
    } else {
      fill.style.inlineSize = '';
      for (const name of ['aria-valuemin', 'aria-valuemax', 'aria-valuenow']) track.removeAttribute(name);
    }
  }

  return {
    async track(job, options = {}) {
      const given = options.label;
      const tracker: Tracker<K> = {
        label: given === undefined ? null : typeof given === 'string' ? { code: given } : given,
        step: null,
        total: null,
        visible: false,
      };
      active.push(tracker);
      const reveal = (): void => {
        tracker.visible = true;
        render();
      };
      const delay = options.delayMs ?? SHOW_DELAY_MS;
      const timer = delay > 0 ? timers.set(reveal, delay) : null;
      if (timer === null) reveal();
      else reveals.add(timer);
      try {
        return await (typeof job === 'function'
          ? job(({ step, total, label: stage }) => {
              tracker.step = step;
              tracker.total = total;
              // a preview stays without text; a labelled job shows its stage
              if (stage && tracker.label) tracker.label = stage;
              if (tracker.visible) render();
            })
          : job);
      } finally {
        if (timer !== null) {
          timers.clear(timer);
          reveals.delete(timer);
        }
        active.splice(active.indexOf(tracker), 1);
        // the bar is up: the jobs still running under it keep it up, their delay or not
        if (tracker.visible) for (const other of active) other.visible = true;
        render();
      }
    },
    refresh: render,
    dispose() {
      disposed = true;
      for (const timer of reveals) timers.clear(timer);
      if (hideTimer !== null) timers.clear(hideTimer);
      wrap.hidden = true;
    },
  };
}
