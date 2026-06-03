'use client';

import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { TRANSLATIONS, AVAILABLE_LANGS, type Lang, type TranslationKey } from '@/i18n/translations';

// Translation strings live in @/i18n/locales (one file per language).
// getTranslation (for non-React contexts) lives in @/i18n/translations.

// ── Context ──────────────────────────────────────────────────────────────────

interface I18nContextValue {
  lang: string;
  t: (key: string, params?: Record<string, string | number>) => string;
  setLang: (lang: string) => void;
  availableLangs: string[];
}

export const I18nContext = createContext<I18nContextValue>({
  lang: 'en',
  t: (key) => key,
  setLang: () => {},
  availableLangs: AVAILABLE_LANGS,
});

export function useI18n() {
  return useContext(I18nContext);
}

export function useI18nProvider() {
  const [lang, setLangState] = useState<Lang>('en');

  useEffect(() => {
    const saved = localStorage.getItem('sw_lang');
    if (saved && saved in TRANSLATIONS) {
      setLangState(saved as Lang);
    } else {
      const browserLang = (navigator.language || 'en').split('-')[0];
      setLangState(browserLang in TRANSLATIONS ? (browserLang as Lang) : 'en');
    }
  }, []);

  const setLang = useCallback((newLang: string) => {
    if (!(newLang in TRANSLATIONS)) return;
    setLangState(newLang as Lang);
    localStorage.setItem('sw_lang', newLang);
    document.documentElement.lang = newLang;
  }, []);

  const t = useCallback((key: string, params?: Record<string, string | number>) => {
    const k = key as TranslationKey;
    const str = TRANSLATIONS[lang]?.[k] || TRANSLATIONS.en[k] || key;
    if (!params) return str;
    return str.replace(/\{(\w+)\}/g, (_, m) => String(params[m] ?? `{${m}}`));
  }, [lang]);

  return { lang, t, setLang, availableLangs: AVAILABLE_LANGS };
}
