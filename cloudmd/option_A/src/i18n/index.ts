import en from './en.json';
import zh from './zh.json';

const translations: Record<string, any> = { en, zh };

export function getLangFromUrl(url: URL): string {
  const [, lang] = url.pathname.split('/');
  if (lang in translations) return lang;
  return 'en';
}

export function useTranslations(lang: string) {
  const dict = translations[lang] || translations['en'];
  return function t(key: string): string {
    const keys = key.split('.');
    let val: any = dict;
    for (const k of keys) {
      if (val && typeof val === 'object' && k in val) {
        val = val[k];
      } else {
        return key;
      }
    }
    return typeof val === 'string' ? val : key;
  };
}

export function getAlternateUrl(url: URL, targetLang: string): string {
  const currentLang = getLangFromUrl(url);
  const pathname = url.pathname;
  if (pathname.startsWith(`/${currentLang}/`)) {
    return pathname.replace(`/${currentLang}/`, `/${targetLang}/`);
  } else if (pathname === `/${currentLang}`) {
    return `/${targetLang}/`;
  }
  return `/${targetLang}${pathname}`;
}

export const languages = {
  en: 'English',
  zh: '中文',
};

export const defaultLang = 'en';
