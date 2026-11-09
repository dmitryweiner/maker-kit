// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { format } from '../core/format';
import type { Translate } from '../core/message';
import type { JobProgress } from '../core/progress';
import { kitEn, kitRu } from '../i18n/index';
import { createProgress } from './progress';

const en = { ...kitEn, exporting: 'Exporting the STL…', 'stage.shell': 'Shell {n}' };
type Key = keyof typeof en;
const ru: Record<Key, string> = { ...kitRu, exporting: 'Экспортирую STL…', 'stage.shell': 'Оболочка {n}' };
let locale: 'en' | 'ru' = 'en';
const t: Translate<Key> = (key, params) => format((locale === 'en' ? en : ru)[key], params, locale);

let wrap: HTMLElement;

/** A job the test ends by hand. */
function deferred<R>() {
  let resolve!: (value: R) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<R>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

const track = () => wrap.querySelector('.progress-track');
const label = () => wrap.querySelector<HTMLElement>('.progress-label');
const fill = () => wrap.querySelector<HTMLElement>('.progress-fill');
const settle = async () => {
  await vi.advanceTimersByTimeAsync(0);
};

beforeEach(() => {
  vi.useFakeTimers();
  locale = 'en';
  document.body.innerHTML = '<div id="bar" class="view-progress" hidden></div>';
  wrap = document.getElementById('bar') ?? document.body;
});

afterEach(() => {
  vi.useRealTimers();
});

describe('createProgress', () => {
  it('shows a running stripe only once a job has run 300 ms, named "Building…" for a screen reader', async () => {
    const progress = createProgress(wrap, { t });
    const job = deferred<number>();
    const result = progress.track(job.promise);
    vi.advanceTimersByTime(299);
    expect(wrap.hidden).toBe(true);
    vi.advanceTimersByTime(1);
    expect(wrap.hidden).toBe(false);
    expect([track()?.getAttribute('role'), track()?.getAttribute('aria-label'), track()?.classList.contains('running')]).toEqual([
      'progressbar',
      'Building…',
      true,
    ]);
    expect(label()?.hidden).toBe(true);
    job.resolve(7);
    expect(await result).toBe(7);
    await settle();
    expect(wrap.hidden).toBe(true);
  });

  it('never shows for a quick job', async () => {
    const progress = createProgress(wrap, { t });
    const result = progress.track(Promise.resolve('fast'));
    expect(await result).toBe('fast');
    vi.advanceTimersByTime(1000);
    expect(wrap.hidden).toBe(true);
  });

  it('is one bar for any number of jobs: it stays until the last one ends', async () => {
    const progress = createProgress(wrap, { t });
    const mesh = deferred<void>();
    const outline = deferred<void>();
    void progress.track(mesh.promise);
    vi.advanceTimersByTime(300);
    void progress.track(outline.promise);
    mesh.resolve();
    await settle();
    expect(wrap.hidden).toBe(false);
    outline.resolve();
    await settle();
    expect(wrap.hidden).toBe(true);
  });

  it('does not blink between a job that ends and the next that starts at once', async () => {
    const progress = createProgress(wrap, { t });
    const first = deferred<void>();
    void progress.track(first.promise, { delayMs: 0 });
    const hides: unknown[] = [];
    new MutationObserver(() => hides.push(wrap.hidden)).observe(wrap, { attributes: true, attributeFilter: ['hidden'] });
    first.resolve();
    await Promise.resolve();
    void progress.track(new Promise(() => {}), { delayMs: 0 });
    await settle();
    expect(wrap.hidden).toBe(false);
    expect(hides).toEqual([]);
  });

  it('shows at once and with its label a job asked for with a button, translated when drawn', async () => {
    const progress = createProgress(wrap, { t });
    void progress.track(new Promise(() => {}), { label: 'exporting', delayMs: 0 });
    expect([wrap.hidden, label()?.hidden]).toEqual([false, false]);
    expect(label()?.textContent).toBe('Exporting the STL…');
    expect(track()?.getAttribute('aria-label')).toBe('Exporting the STL…');
    locale = 'ru';
    progress.refresh();
    expect(label()?.textContent).toBe('Экспортирую STL…');
  });

  it('shows the share done when the job reports steps, and its stage when it is labelled', async () => {
    const progress = createProgress(wrap, { t });
    const reporter: { report?: (p: JobProgress<Key>) => void } = {};
    void progress.track(
      (onProgress) => {
        reporter.report = onProgress;
        return new Promise(() => {});
      },
      { label: 'exporting', delayMs: 0 },
    );
    reporter.report?.({ step: 1, total: 4, label: { code: 'stage.shell', params: { n: 2 } } });
    expect(track()?.classList.contains('running')).toBe(false);
    expect([fill()?.style.inlineSize, track()?.getAttribute('aria-valuenow')]).toEqual(['25%', '25']);
    expect(label()?.textContent).toBe('Shell 2');
  });

  it('hides and passes the error on when a job fails', async () => {
    const progress = createProgress(wrap, { t });
    const job = deferred<void>();
    const result = progress.track(job.promise, { delayMs: 0 });
    job.reject(new Error('crashed'));
    await expect(result).rejects.toThrow('crashed');
    await settle();
    expect(wrap.hidden).toBe(true);
  });

  it('takes no pointer events: the view under it can still be turned', () => {
    createProgress(wrap, { t });
    expect(wrap.classList.contains('view-progress')).toBe(true);
  });

  it('hides for good on dispose', () => {
    const progress = createProgress(wrap, { t });
    void progress.track(new Promise(() => {}));
    progress.dispose();
    vi.advanceTimersByTime(1000);
    expect(wrap.hidden).toBe(true);
  });
});
