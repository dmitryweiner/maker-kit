// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import type { Translate } from '../core/message';
import { kitEn } from '../i18n/index';
import { renderBanner, storageNotes } from './banner';

const t: Translate<keyof typeof kitEn> = (key) => kitEn[key];

describe('storageNotes', () => {
  it('are empty while everything is kept', () => {
    expect(storageNotes({ project: 'ok', preset: null })).toEqual([]);
  });

  it('say why the project is not kept, for as long as it fails', () => {
    expect(storageNotes({ project: 'blocked', preset: null })).toEqual([{ key: 'kit.storage.project.blocked', dismiss: false, bad: true }]);
    expect(storageNotes({ project: 'full', preset: null })).toEqual([{ key: 'kit.storage.project.full', dismiss: false, bad: false }]);
  });

  it('add a failed preset action, which can be dismissed', () => {
    expect(storageNotes({ project: 'ok', preset: { action: 'save', result: 'full' } })).toEqual([
      { key: 'kit.storage.preset.saveFull', dismiss: true, bad: false },
    ]);
    expect(storageNotes({ project: 'blocked', preset: { action: 'save', result: 'blocked' } })).toEqual([
      { key: 'kit.storage.project.blocked', dismiss: false, bad: true },
      { key: 'kit.storage.preset.save', dismiss: true, bad: true },
    ]);
    expect(storageNotes({ project: 'ok', preset: { action: 'delete', result: 'blocked' } })).toEqual([
      { key: 'kit.storage.preset.delete', dismiss: true, bad: true },
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
    renderBanner(banner, { project: 'ok', preset: null }, { t, onDismiss: () => {} });
    expect(banner.hidden).toBe(true);
  });

  it('draws a line per note, a dismiss button on the preset’s, red when nothing is kept', () => {
    let dismissed = 0;
    renderBanner(banner, { project: 'blocked', preset: { action: 'delete', result: 'blocked' } }, { t, onDismiss: () => dismissed++ });
    expect(banner.hidden).toBe(false);
    expect(banner.getAttribute('role')).toBe('status');
    expect(banner.classList.contains('bad')).toBe(true);
    const lines = [...banner.querySelectorAll('.banner-line')];
    expect(lines.map((line) => line.querySelector('span')?.textContent)).toEqual([
      kitEn['kit.storage.project.blocked'],
      kitEn['kit.storage.preset.delete'],
    ]);
    expect(lines[0]?.querySelector('button')).toBeNull();
    const dismiss = lines[1]?.querySelector('button');
    expect(dismiss?.textContent).toBe('Dismiss');
    dismiss?.click();
    expect(dismissed).toBe(1);
  });

  it('is in the warn colour when the storage is only full', () => {
    renderBanner(banner, { project: 'full', preset: null }, { t, onDismiss: () => {} });
    expect(banner.classList.contains('bad')).toBe(false);
  });
});
