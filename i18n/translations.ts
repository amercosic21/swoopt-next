import { en, type TranslationKey } from './locales/en';
import { bs } from './locales/bs';

export type { TranslationKey };

/** Supported language codes. Add a new locale here and in TRANSLATIONS below. */
export type Lang = 'en' | 'bs';

export const TRANSLATIONS: Record<Lang, Record<TranslationKey, string>> = { en, bs };

export const AVAILABLE_LANGS = Object.keys(TRANSLATIONS) as Lang[];

/** Substitute {placeholders} in a translated string with the given params. */
function interpolate(str: string, params?: Record<string, string | number>): string {
  if (!params) return str;
  return str.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`));
}

/**
 * Translate a key using the language saved in localStorage. For use outside
 * React components (timers, callbacks, plain modules); inside components use the
 * `t` from the useI18n() hook so re-renders track language changes.
 */
export function getTranslation(key: string, params?: Record<string, string | number>): string {
  const saved = typeof window !== 'undefined' ? localStorage.getItem('sw_lang') : null;
  const lang = (saved && saved in TRANSLATIONS ? saved : 'en') as Lang;
  const str = TRANSLATIONS[lang][key as TranslationKey] ?? TRANSLATIONS.en[key as TranslationKey] ?? key;
  return interpolate(str, params);
}
