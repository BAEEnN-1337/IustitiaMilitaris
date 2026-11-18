import type { Language } from './index';

export function formatNormDisplayId(id: string, lang: Language): string {
  if (lang !== 'uk') return id;
  const prefixes: Record<string, string> = { ZPK:'ЗПК', ZAD:'ЗАД', ZO:'ЗО', SVS:'СВС', KMU:'КМУ', NAZK:'НАЗК', OECD:'ОЕСР', KUPAP:'КУпАП', KZPP:'КЗпП', KKU:'ККУ', KK:'ККУ', KONST:'Конст.', CONST:'Конст.', ZDS:'ЗДС', DS:'ЗДС', ZPZ:'ЗПЗ', PROC:'ЗПЗ', ZRP:'ЗРП', GEND:'ЗРП', EQUAL:'ЗРП', VS:'ВС', SUPREME:'ВС' };
  return id.replace(/^[A-Z]+(?=-)/, prefix => prefixes[prefix] || prefix);
}

export function formatNormChipPoint(norm: { id: string; punkt: string; typ?: string }, lang: Language): string {
  if (norm.typ === 'sudova-praktyka' || /^(VS|SUPREME)-/.test(norm.id)) {
    const number = norm.punkt.match(/\d+\/\d+\/\d+(?:-[\p{L}]+)?/u)?.[0];
    if (number) return `${lang === 'uk' ? '№' : 'No.'} ${number}`;
  }
  const short = norm.punkt.split(/\s+[—–]\s+|:/)[0].trim();
  return lang === 'en' ? short.replace(/^Article\b/i, 'Art.') : short;
}
