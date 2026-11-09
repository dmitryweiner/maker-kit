// The language switch at the end of the top bar: 🌐 and a list of the
// languages, each by its own name. Detecting the language and keeping the
// choice stay in the app (web-app-template's `detectLocale`).

import type { Translate } from '../core/message';
import type { KitKey } from '../i18n/index';
import { make } from './dom';

/** The kit's languages by their own names. */
export const ENDONYMS: Readonly<Record<string, string>> = { en: 'English', ru: 'Русский', uk: 'Українська', he: 'עברית' };

export interface LanguagePickerOptions<L extends string> {
  locales: readonly L[];
  current: L;
  /** names of languages the kit does not ship */
  names?: Partial<Record<L, string>>;
  t: Translate<KitKey>;
  onChange(locale: L): void;
}

export interface LanguagePickerHandle<L extends string> {
  /** shows the language the app switched to, its label in it */
  set(locale: L): void;
}

export function createLanguagePicker<L extends string>(container: HTMLElement, o: LanguagePickerOptions<L>): LanguagePickerHandle<L> {
  const field = make('label', 'lang-field');
  const globe = make('span', 'lang-globe', '🌐');
  globe.setAttribute('aria-hidden', 'true');
  const select = make('select');
  for (const locale of o.locales) {
    const option = make('option', undefined, o.names?.[locale] ?? ENDONYMS[locale] ?? locale);
    option.value = locale;
    select.append(option);
  }
  select.addEventListener('change', () => {
    const chosen = o.locales.find((locale) => locale === select.value);
    if (chosen !== undefined) o.onChange(chosen);
  });
  field.append(globe, select);
  container.append(field);

  const set = (locale: L): void => {
    select.value = locale;
    select.setAttribute('aria-label', o.t('kit.topbar.language'));
    select.title = o.t('kit.topbar.language');
  };
  set(o.current);
  return { set };
}
