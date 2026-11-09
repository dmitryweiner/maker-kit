// The kit's strings in every language it ships. An app takes the ones it
// ships too; the locale detection and the switcher's storage stay in the app.

import { kitEn, type KitKey, type KitMessages } from './en';
import { kitHe } from './he';
import { kitRu } from './ru';
import { kitUk } from './uk';

export { kitEn, kitHe, kitRu, kitUk };
export type { KitKey, KitMessages };

export type KitLocale = 'en' | 'ru' | 'uk' | 'he';
export const KIT_LOCALES: readonly KitLocale[] = ['en', 'ru', 'uk', 'he'];
export const kitMessages: Readonly<Record<KitLocale, KitMessages>> = { en: kitEn, ru: kitRu, uk: kitUk, he: kitHe };
