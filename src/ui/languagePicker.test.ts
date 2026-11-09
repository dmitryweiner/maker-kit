// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import type { Translate } from '../core/message';
import { kitEn, kitHe } from '../i18n/index';
import { createLanguagePicker } from './languagePicker';

let dict: Record<keyof typeof kitEn, string> = kitEn;
const t: Translate<keyof typeof kitEn> = (key) => dict[key];

beforeEach(() => {
  dict = kitEn;
  document.body.innerHTML = '<div id="bar"></div>';
});

describe('createLanguagePicker', () => {
  it('lists the languages by their own names, the current one chosen, under 🌐', () => {
    const bar = document.getElementById('bar') ?? document.body;
    createLanguagePicker(bar, { locales: ['en', 'ru', 'uk', 'he'], current: 'he', t, onChange: () => {} });
    const select = bar.querySelector('select');
    expect([...(select?.options ?? [])].map((o) => [o.value, o.textContent])).toEqual([
      ['en', 'English'],
      ['ru', 'Русский'],
      ['uk', 'Українська'],
      ['he', 'עברית'],
    ]);
    expect(select?.value).toBe('he');
    expect(select?.getAttribute('aria-label')).toBe('Language');
    expect(bar.querySelector('.lang-field .lang-globe')?.textContent).toBe('🌐');
  });

  it('takes the names of languages the kit does not ship', () => {
    const bar = document.getElementById('bar') ?? document.body;
    createLanguagePicker(bar, { locales: ['en', 'de'], names: { de: 'Deutsch' }, current: 'en', t, onChange: () => {} });
    expect([...(bar.querySelector('select')?.options ?? [])].map((o) => o.textContent)).toEqual(['English', 'Deutsch']);
  });

  it('reports a choice, and follows the language when set and refreshed', () => {
    const bar = document.getElementById('bar') ?? document.body;
    const chosen: string[] = [];
    const picker = createLanguagePicker(bar, { locales: ['en', 'he'], current: 'en', t, onChange: (locale) => chosen.push(locale) });
    const select = bar.querySelector('select');
    if (!select) throw new Error('no select');
    select.value = 'he';
    select.dispatchEvent(new Event('change'));
    expect(chosen).toEqual(['he']);
    dict = kitHe;
    picker.set('he');
    expect([select.value, select.getAttribute('aria-label')]).toEqual(['he', 'שפה']);
  });
});
