'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { vi } from '../locales/vi';
import { en } from '../locales/en';

type Language = 'vi' | 'en';
type Dictionary = typeof vi;

type TranslationFunction = ((key: string, params?: Record<string, string | number>) => string) & Dictionary;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TranslationFunction;
}

const dictionaries: Record<Language, Dictionary> = { vi, en };

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('vi');

  useEffect(() => {
    console.log("LanguageContext loaded, forcing dictionary reload");
    // Load language from localStorage or cookie on initial load
    const savedLang = localStorage.getItem('app_language') as Language;
    if (savedLang && (savedLang === 'vi' || savedLang === 'en')) {
      setLanguageState(savedLang);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('app_language', lang);
    // Also save to cookie if we want server-components to read it later (optional)
    document.cookie = `NEXT_LOCALE=${lang}; path=/; max-age=31536000`;
  };

  const t = React.useMemo(() => {
    const tFunc = (key: string, params?: Record<string, string | number>): string => {
      const keys = key.split('.');
      let value: any = dictionaries[language];

      for (const k of keys) {
        if (value === undefined || value === null) break;
        value = value[k as keyof typeof value];
      }

      if (typeof value !== 'string') {
        console.warn(`Translation key not found: ${key}`);
        return key; // Fallback to key if not found
      }

      let text = value;
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          text = text.replace(new RegExp(`{{${k}}}`, 'g'), String(v));
        });
      }

      return text;
    };
    return Object.assign(tFunc, dictionaries[language]);
  }, [language]);

  const contextValue = React.useMemo(() => ({ language, setLanguage, t }), [language, t]);

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
}
