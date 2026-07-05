'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { catalog, Locale, Catalog } from './catalog';

type TranslationArgs<K extends keyof Catalog> = Catalog[K] extends (...args: infer Args) => unknown ? Args : [];

type I18nContextType = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: <K extends keyof Catalog>(key: K, ...args: TranslationArgs<K>) => string;
};

const I18nContext = createContext<I18nContextType | undefined>(undefined);

function isLocale(value: string | null): value is Locale {
  return value === 'en' || value === 'es' || value === 'fr' || value === 'ar';
}

function getInitialLocale() {
  if (typeof window === 'undefined') return 'en';

  const saved = localStorage.getItem('i18n_locale');
  return isLocale(saved) ? saved : 'en';
}

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocale] = useState<Locale>(getInitialLocale);

  // Dynamically set HTML lang and direction (RTL support)
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
  }, [locale]);

  const handleSetLocale = (newLocale: Locale) => {
    setLocale(newLocale);
    localStorage.setItem('i18n_locale', newLocale);
  };

  const t = <K extends keyof Catalog>(key: K, ...args: TranslationArgs<K>): string => {
    const item = catalog[locale][key];
    if (typeof item === 'function') {
      const formatter = item as unknown as (...formatterArgs: TranslationArgs<K>) => string;
      return formatter(...args);
    }
    return item as string;
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale: handleSetLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};