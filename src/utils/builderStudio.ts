import type { Scenario, Node, Variant } from '../types';
import type { Language } from '../i18n';
import labels from '../i18n/builderStudio.json';

export function nextScenarioId(ids: Iterable<string>): string | null {
  const numbers = [...ids].filter(id => /^S\d{2}$/.test(id)).map(id => Number(id.slice(1)));
  const next = Math.max(0, ...numbers) + 1;
  return next <= 99 ? `S${String(next).padStart(2, '0')}` : null;
}

export function knownScenarioIds(catalog: { id: string }[]): string[] {
  const ids = catalog.map(s => s.id);
  try {
    const saved: unknown = JSON.parse(sessionStorage.getItem('builder-scenario-ids') || '[]');
    if (Array.isArray(saved)) ids.push(...saved.filter((id): id is string => typeof id === 'string' && /^S\d{2}$/.test(id)));
    const preview = JSON.parse(sessionStorage.getItem('builder-preview') || 'null');
    if (typeof preview?.id === 'string' && /^S\d{2}$/.test(preview.id)) ids.push(preview.id);
  } catch { /* Storage may be unavailable; catalogue IDs remain authoritative. */ }
  return [...new Set(ids)];
}

export function nextVariantId(scenario: Scenario): string {
  const used = new Set(scenario.vuzly.flatMap(n => n.varianty.map(v => v.id)));
  for (const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') for (const suffix of ['', ...Array.from({length:10},(_,i)=>String(i))]) if (!used.has(letter+suffix)) return letter+suffix;
  throw Error('No option IDs available');
}
export function freshVariant(scenario: Scenario, lang: Language): Variant {
  const t=labels[lang];
  return {id:nextVariantId(scenario),tekst:t.option,naslidky:{odrazu:t.immediate,vidkladeni:t.delayed},baly:{dobrochesnist:0,efektyvnist:0,dovira:0},chomu_taki_baly:t.reason,zvorotnyi_zviazok:t.feedback,normy:[],nastupnyi_vuzol:null};
}
export function freshNode(scenario: Scenario, lang: Language): Node {
  let number=1;while(scenario.vuzly.some(n=>n.id===`V${number}`))number++;
  const node:Node={id:`V${number}`,tekst:labels[lang].situation,zapytannia:labels[lang].question,varianty:[]};
  const draft=structuredClone(scenario);draft.vuzly.push(node);
  for(let i=0;i<2;i++)node.varianty.push(freshVariant(draft,lang));
  return node;
}
export function reachableNodes(scenario: Scenario): Set<string> {
  const reached=new Set<string>(),queue=[scenario.pochatkovyi_vuzol];
  while(queue.length){const id=queue.pop()!;if(reached.has(id))continue;reached.add(id);for(const v of scenario.vuzly.find(n=>n.id===id)?.varianty||[])if(v.nastupnyi_vuzol)queue.push(v.nastupnyi_vuzol);}
  return reached;
}
