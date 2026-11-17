import type { Scenario } from '../types';
import type { Language } from './index';

export function caseLabel(id: string, lang: Language): string {
  const match = /^S(\d+)$/u.exec(id);
  return match
    ? `${lang === 'uk' ? 'ЗАДАЧА' : 'CASE'} ${Number(match[1])}`
    : id;
}
export function optionLabel(index: number, lang: Language): string {
  return (
    (lang === 'uk'
      ? 'АБВГҐДЕЄЖЗИІЇЙКЛМНОПРСТУФХЦЧШЩЮЯ'
      : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ')[index] || '—'
  );
}
export function stageLabel(
  scenario: Scenario,
  nodeId: string,
  lang: Language,
  withTitle = true
): string {
  const index = scenario.vuzly.findIndex((node) => node.id === nodeId);
  const node = scenario.vuzly[index];
  const heading = [node?.zapytannia, node?.tekst]
    .map((text) =>
      text?.match(/^(?:Етап|Stage)\s*(\d+)\s*[.·:–—-]\s*([^\n.!?]+)/iu)
    )
    .find(Boolean);
  const number = heading?.[1] ?? (index < 0 ? '—' : index + 1);
  const title = withTitle ? heading?.[2]?.trim() : undefined;
  return `${lang === 'uk' ? 'Етап' : 'Stage'} ${number}${title ? ` · ${title}` : ''}`;
}
export function variantLabel(
  scenario: Scenario,
  nodeId: string,
  variantId: string,
  lang: Language
): string {
  return optionLabel(
    scenario.vuzly
      .find((node) => node.id === nodeId)
      ?.varianty.findIndex((variant) => variant.id === variantId) ?? -1,
    lang
  );
}
export function choiceLabel(
  scenario: Scenario,
  nodeId: string,
  variantId: string,
  lang: Language
): string {
  return `${stageLabel(scenario, nodeId, lang)} · ${lang === 'uk' ? 'Варіант' : 'Option'} ${variantLabel(scenario, nodeId, variantId, lang)}`;
}

export function scenarioStageCount(scenario: Scenario): number {
  const nodes = new Map(scenario.vuzly.map(node => [node.id, node]));
  const lengths = new Map<string, number>();
  function depth(id: string, trail = new Set<string>()): number {
    if (trail.has(id) || !nodes.has(id)) return 0;
    const known = lengths.get(id);
    if (known !== undefined) return known;
    const next = new Set(trail).add(id);
    const length = 1 + Math.max(0, ...nodes.get(id)!.varianty.map(variant =>
      variant.nastupnyi_vuzol ? depth(variant.nastupnyi_vuzol, next) : 0
    ));
    lengths.set(id, length);
    return length;
  }
  return depth(scenario.pochatkovyi_vuzol);
}
