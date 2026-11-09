// Templates of the dictionaries (Case Constructor's and Cast Builder's
// syntax): `{name}` substitutes a parameter; `{n|form|form…}` picks a word by
// the number n, the forms in the order of the language's plural categories
// as CLDR lists them (en: one|other; ru, uk: one|few|many; he: one|two|other).
// A category without a form of its own (a fraction in Russian) takes the last.

import type { Params } from './message';

const PLACEHOLDER = /\{(\w+)(?:\|([^}]*))?\}/g;
/** CLDR's order of the plural categories. */
const CATEGORY_ORDER: readonly Intl.LDMLPluralRule[] = ['zero', 'one', 'two', 'few', 'many', 'other'];

const orders = new Map<string, { rules: Intl.PluralRules; order: readonly Intl.LDMLPluralRule[] }>();

/** The locale's plural rules and the order of its categories in `{n|…}`, cached per locale. */
function pluralOf(locale: string): { rules: Intl.PluralRules; order: readonly Intl.LDMLPluralRule[] } {
  let found = orders.get(locale);
  if (!found) {
    const rules = new Intl.PluralRules(locale);
    const used = new Set(rules.resolvedOptions().pluralCategories);
    found = { rules, order: CATEGORY_ORDER.filter((category) => used.has(category)) };
    orders.set(locale, found);
  }
  return found;
}

export function format(template: string, params: Params | undefined, locale: string): string {
  return template.replace(PLACEHOLDER, (whole, name: string, forms: string | undefined) => {
    const value = params?.[name];
    if (value === undefined) return whole;
    if (forms === undefined) return String(value);
    const variants = forms.split('|');
    const { rules, order } = pluralOf(locale);
    const index = order.indexOf(rules.select(Number(value)));
    return variants[index >= 0 && index < variants.length ? index : variants.length - 1] ?? whole;
  });
}

/** Parameter names of a template, each once, sorted — for the test that every language has the same. */
export function placeholders(template: string): string[] {
  return [...new Set([...template.matchAll(PLACEHOLDER)].map((match) => match[1] ?? ''))].toSorted();
}
