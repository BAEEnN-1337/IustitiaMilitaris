import { createContext, useContext } from 'react';
import type { Language } from './index';
import uk from './ui.uk.json';
import en from './ui.en.json';
export const LanguageContext = createContext<Language>('uk');
export const useLanguage = () => useContext(LanguageContext);
export function ui(lang: Language, key: keyof typeof en, ...args: unknown[]): string {
  return (lang === 'en' ? en[key] : uk[key]).replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ''));
}
export function localizeMessage(message: string, lang: Language): string {
  const key = (Object.keys(uk) as (keyof typeof uk)[]).find(k => uk[k] === message || en[k] === message);
  return key ? ui(lang, key) : message;
}
