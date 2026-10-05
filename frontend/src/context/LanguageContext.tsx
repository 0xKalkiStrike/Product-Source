import React, { createContext, useContext, useState } from 'react';

export interface LocaleConfig {
  code: string;
  name: string;
  currency: string;
  symbol: string;
  exchangeRateToUSD: number; // 1 USD = X Local
}

export const SUPPORTED_LOCALES: LocaleConfig[] = [
  { code: 'en-US', name: 'English (US / Int - USD $)', currency: 'USD', symbol: '$', exchangeRateToUSD: 1.0 },
  { code: 'en-GB', name: 'English (UK - GBP £)', currency: 'GBP', symbol: '£', exchangeRateToUSD: 0.79 },
  { code: 'en-EU', name: 'English (Europe - EUR €)', currency: 'EUR', symbol: '€', exchangeRateToUSD: 0.92 },
  { code: 'ja-JP', name: 'Japanese (Asia - JPY ¥)', currency: 'JPY', symbol: '¥', exchangeRateToUSD: 151.5 },
  { code: 'zh-CN', name: 'Chinese (Asia - CNY ¥)', currency: 'CNY', symbol: '¥', exchangeRateToUSD: 7.23 },
  { code: 'hi-IN', name: 'Hindi (Asia - INR ₹)', currency: 'INR', symbol: '₹', exchangeRateToUSD: 83.3 },
  { code: 'es-ES', name: 'Spanish (Int - EUR €)', currency: 'EUR', symbol: '€', exchangeRateToUSD: 0.92 },
];

interface LanguageContextType {
  currentLocale: LocaleConfig;
  setLocale: (code: string) => void;
  formatPrice: (usdAmount: number) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentLocale, setCurrentLocaleState] = useState<LocaleConfig>(SUPPORTED_LOCALES[0]);

  const setLocale = (code: string) => {
    const found = SUPPORTED_LOCALES.find(l => l.code === code);
    if (found) setCurrentLocaleState(found);
  };

  const formatPrice = (usdAmount: number): string => {
    const converted = usdAmount * currentLocale.exchangeRateToUSD;
    return new Intl.NumberFormat(currentLocale.code, {
      style: 'currency',
      currency: currentLocale.currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(converted);
  };

  return (
    <LanguageContext.Provider value={{ currentLocale, setLocale, formatPrice }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
};
