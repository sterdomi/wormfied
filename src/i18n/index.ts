import { de } from './de';
import { en } from './en';
import type { TranslationKey } from './de';

export type Locale = 'de' | 'en';
export type { TranslationKey };

const catalogs: Record<Locale, Record<TranslationKey, string>> = { de, en };

// Vorerst fest auf Deutsch. Später ableitbar aus URL, localStorage oder
// navigator.language.
let currentLocale: Locale = 'de';

export function setLocale(locale: Locale): void {
  currentLocale = locale;
}

export function getLocale(): Locale {
  return currentLocale;
}

/** Übersetzt einen Key in die aktuelle Sprache, mit Deutsch als Fallback. */
export function t(key: TranslationKey): string {
  return catalogs[currentLocale][key] ?? catalogs.de[key] ?? key;
}
