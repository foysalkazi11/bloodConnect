import React, { createContext, useContext, useState, useEffect } from 'react';
import i18n from '@/localization/i18n';
import { I18nextProvider } from 'react-i18next';

interface I18nContextType {
  currentLanguage: string;
  changeLanguage: (lang: string) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [currentLanguage, setCurrentLanguage] = useState('en');

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    setCurrentLanguage(lang);
  };

  const t = (key: string) => i18n.t(key);

  useEffect(() => {
    // Initialize with system language or saved preference
    const initLanguage = 'en'; // Default to English
    changeLanguage(initLanguage);
  }, []);

  return (
    <I18nextProvider i18n={i18n}>
      <I18nContext.Provider value={{ currentLanguage, changeLanguage, t }}>
        {children}
      </I18nContext.Provider>
    </I18nextProvider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}