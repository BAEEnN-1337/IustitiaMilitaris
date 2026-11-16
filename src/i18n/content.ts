import type { Language } from './index';
import type { NormEntry, NormsData } from '../types';
import originalNorms from '../../normy.json';
import englishNorms from './norms.en.json';
export function localizeNorm(norm: NormEntry, lang: Language): NormEntry {
  const source = originalNorms.normy.find(n => n.id === norm.id) as NormEntry | undefined;
  return lang === 'en' ? (englishNorms.normy as Record<string, NormEntry>)[norm.id] ?? norm : source ?? norm;
}
export function localizeNorms(data: NormsData, lang: Language): NormsData {
  if (lang === 'uk') return data;
  return { ...data, nazva: englishNorms.nazva, prymitka: englishNorms.prymitka,
    statusy: englishNorms.statusy, normy: data.normy.map(norm => localizeNorm(norm, lang)) };
}

// Content overlays are kept outside the strict authoring schema. Missing fields
// retain their source text; imported/custom scenarios are never overwritten.
import type { Scenario } from '../types';
import scenarioEnglish from './scenarios.en.json';
import { allScenarios } from '../data/scenarios';
const originals = new Map(allScenarios.map(s => [s.id, s]));
const localized = new Map<string, Scenario>();
export function localizeScenario(scenario: Scenario, lang: Language): Scenario {
  const original = originals.get(scenario.id);
  const overlay = (scenarioEnglish as Record<string, Partial<Scenario>>)[scenario.id];
  if (!original || !overlay) return scenario;
  const translated = localized.get(scenario.id) ?? { ...original, ...overlay };
  // Imports are new objects. Recognise exact copies of either built-in language,
  // while preserving edits and custom scenarios even when their IDs collide.
  if (scenario !== original && scenario !== translated) {
    const serialized = JSON.stringify(scenario);
    if (serialized !== JSON.stringify(original) && serialized !== JSON.stringify(translated)) return scenario;
  }
  localized.set(scenario.id, translated);
  return lang === 'uk' ? original : translated;
}
