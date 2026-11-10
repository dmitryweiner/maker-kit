// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import type { Translate } from '../core/message';
import { kitEn } from '../i18n/index';
import { renderBanner, storageNotes } from './banner';

const t: Translate<keyof typeof kitEn> = (key) => kitEn[key];
/** An app with a project file (Plate Builder): the kit's own advice. */
const FILE = { blocked: 'kit.storage.advice.file', full: 'kit.storage.advice.fileFull' } as const;

describe('storageNotes', () => {
  it('are empty while everything is kept', () => {
    expect(storageNotes({ project: 'ok', preset: null })).toEqual([]);
  });

  it('say why the project is not kept, for as long as it fails, and that the app has advice', () => {
    expect(storageNotes({ project: 'blocked', preset: null })).toEqual([
      { key: 'kit.storage.project.blocked', advice: 'blocked', dismiss: false, bad: true },
    ]);
    expect(storageNotes({ project: 'full', preset: null })).toEqual([
      { key: 'kit.storage.project.full', advice: 'full', dismiss: false, bad: false },
    ]);
  });

  it('add a failed preset action, which can be dismissed', () => {
    expect(storageNotes({ project: 'ok', preset: { action: 'save', result: 'full' } })).toEqual([
      { key: 'kit.storage.preset.saveFull', advice: null, dismiss: true, bad: false },
    ]);
    expect(storageNotes({ project: 'blocked', preset: { action: 'save', result: 'blocked' } })).toEqual([
      { key: 'kit.storage.project.blocked', advice: 'blocked', dismiss: false, bad: true },
      { key: 'kit.storage.preset.save', advice: null, dismiss: true, bad: true },
    ]);
    expect(storageNotes({ project: 'ok', preset: { action: 'delete', result: 'blocked' } })).toEqual([
      { key: 'kit.storage.preset.delete', advice: null, dismiss: true, bad: true },
    ]);
  });
});

describe('renderBanner', () => {
  let banner: HTMLElement;
  beforeEach(() => {
    document.body.innerHTML = '<div id="banner" class="banner" hidden></div>';
    banner = document.getElementById('banner') ?? document.body;
  });

  it('is hidden with nothing to say', () => {
    renderBanner(banner, { project: 'ok', preset: null }, { t, advice: FILE, onDismiss: () => {} });
    expect(banner.hidden).toBe(true);
  });

  it('draws a line per note, a dismiss button on the preset’s, red when nothing is kept', () => {
    let dismissed = 0;
    renderBanner(
      banner,
      { project: 'blocked', preset: { action: 'delete', result: 'blocked' } },
      { t, advice: FILE, onDismiss: () => dismissed++ },
    );
    expect(banner.hidden).toBe(false);
    expect(banner.getAttribute('role')).toBe('status');
    expect(banner.classList.contains('bad')).toBe(true);
    const lines = [...banner.querySelectorAll('.banner-line')];
    expect(lines.map((line) => line.querySelector('span')?.textContent)).toEqual([
      `${kitEn['kit.storage.project.blocked']} ${kitEn['kit.storage.advice.file']}`,
      kitEn['kit.storage.preset.delete'],
    ]);
    expect(lines[0]?.querySelector('button')).toBeNull();
    const dismiss = lines[1]?.querySelector('button');
    expect(dismiss?.textContent).toBe('Dismiss');
    dismiss?.click();
    expect(dismissed).toBe(1);
  });

  it('is in the warn colour when the storage is only full', () => {
    renderBanner(banner, { project: 'full', preset: null }, { t, advice: FILE, onDismiss: () => {} });
    expect(banner.classList.contains('bad')).toBe(false);
  });

  it('says what to do in the app’s words: an app with no project file gives its own advice', () => {
    const own = { 'app.blocked': 'Open the model again after a reload.', 'app.full': 'Open a smaller model.' } as const;
    const appT: Translate<keyof typeof own | keyof typeof kitEn> = (key) =>
      key in own ? own[key as keyof typeof own] : kitEn[key as keyof typeof kitEn];
    renderBanner(
      banner,
      { project: 'full', preset: null },
      { t: appT, advice: { blocked: 'app.blocked', full: 'app.full' }, onDismiss: () => {} },
    );
    expect(banner.textContent).toBe(`${kitEn['kit.storage.project.full']} Open a smaller model.`);
  });

  it('with the kit’s advice reads as the banner did before the advice was the app’s', () => {
    renderBanner(banner, { project: 'blocked', preset: null }, { t, advice: FILE, onDismiss: () => {} });
    expect(banner.textContent).toBe(
      'This browser does not keep your project: its storage is unavailable (a private window or blocked site data). Save the project to a file with ⬇️ before closing the page.',
    );
    renderBanner(banner, { project: 'full', preset: null }, { t, advice: FILE, onDismiss: () => {} });
    expect(banner.textContent).toBe(
      'Your latest changes are not kept in this browser: its storage is full. Delete presets you no longer need, or save the project to a file with ⬇️.',
    );
  });
});
