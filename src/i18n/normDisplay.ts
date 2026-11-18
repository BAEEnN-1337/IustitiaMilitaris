import type { Language } from './index';

export function formatNormDisplayId(id: string, lang: Language): string {
  if (lang !== 'uk') return id;
  const prefixes: Record<string, string> = { ZPK:'ЗПК', ZAD:'ЗАД', ZO:'ЗО', SVS:'СВС', KMU:'КМУ', NAZK:'НАЗК', OECD:'ОЕСР', KUPAP:'КУпАП', KZPP:'КЗпП', KKU:'ККУ', KK:'ККУ', KONST:'Конст.', CONST:'Конст.', ZDS:'ЗДС', DS:'ЗДС', ZPZ:'ЗПЗ', PROC:'ЗПЗ', ZRP:'ЗРП', GEND:'ЗРП', EQUAL:'ЗРП', VS:'ВС', SUPREME:'ВС' };
  return id.replace(/^[A-Z]+(?=-)/, prefix => prefixes[prefix] || prefix);
}
