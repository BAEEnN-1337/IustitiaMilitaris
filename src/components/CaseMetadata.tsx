import React from 'react';
import { AlertCircle, FileCheck, Sparkles } from 'lucide-react';
import { Language } from '../i18n';
import labels from '../i18n/caseBadges.json';
import type { Scenario } from '../types';

export function CaseMetadata({ scenario, lang }: { scenario: Scenario; lang: Language }) {
  const t = labels[lang];
  const fictional = ['вигаданий', 'fictional'].includes(scenario.dzherelo_vypadku.typ);
  const source = /\bCIDS\b/i.test(scenario.dzherelo_vypadku.opys) ? t.cids : fictional ? t.training : t.practice;
  const verified = ['проведено', 'verified'].includes(scenario.perevirka_zmistu.fakhivets_dzpk);
  const row = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-sm font-mono text-[10px] uppercase tracking-wider border border-steel-700/80 bg-obsidian-850/90 whitespace-nowrap';
  return (
    <div className="case-metadata-strip flex flex-wrap items-center gap-1.5 sm:gap-2 mt-auto pt-3">
      <div className={`${row} ${verified ? 'text-status-success' : 'text-status-warning'}`} title={scenario.perevirka_zmistu.prymitka}>
        <AlertCircle className="w-3 h-3 shrink-0" />
        <span>{verified ? t.verified : t.draft}</span>
      </div>
      {scenario.shi.vykorystano && (
        <div className={`${row} text-tactical-ice`} title={`${scenario.shi.instrument}: ${scenario.shi.shcho_zrobleno}`}>
          <Sparkles className="w-3 h-3 shrink-0" />
          <span>{t.ai}</span>
        </div>
      )}
      <div className={`${row} text-steel-300`} title={scenario.dzherelo_vypadku.opys}>
        <FileCheck className="w-3 h-3 shrink-0" />
        <span>{source}</span>
      </div>
    </div>
  );
}
