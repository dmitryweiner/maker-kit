import { describe, expect, it } from 'vitest';
import { format, placeholders } from '../core/format';
import { KIT_LOCALES, kitMessages, type KitKey } from './index';

const keys = Object.keys(kitMessages.en).filter((key): key is KitKey => Object.hasOwn(kitMessages.en, key));

describe('the kit’s strings', () => {
  it('are all under kit.*', () => {
    expect(keys.length).toBeGreaterThan(0);
    expect(keys.filter((key) => !key.startsWith('kit.'))).toEqual([]);
  });

  it.each(KIT_LOCALES)('%s has every key, none empty, nothing more', (locale) => {
    const dict: Record<string, string> = kitMessages[locale];
    expect(Object.keys(dict).toSorted()).toEqual(keys.toSorted());
    expect(keys.filter((key) => !dict[key]?.trim())).toEqual([]);
  });

  it.each(KIT_LOCALES)('%s has the parameters of English in every string', (locale) => {
    const differ = keys.filter(
      (key) => JSON.stringify(placeholders(kitMessages[locale][key])) !== JSON.stringify(placeholders(kitMessages.en[key])),
    );
    expect(differ).toEqual([]);
  });

  it.each(KIT_LOCALES)('%s fills every template it has', (locale) => {
    for (const key of keys) {
      const template = kitMessages[locale][key];
      const params = Object.fromEntries(placeholders(template).map((name) => [name, 2]));
      expect(format(template, params, locale)).not.toMatch(/[{}]/);
    }
  });
});
