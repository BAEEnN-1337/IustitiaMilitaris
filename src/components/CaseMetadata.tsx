import React from 'react';
import { AlertCircle, FileCheck, ShieldCheck, Sparkles } from 'lucide-react';
import { Language, translations } from '../i18n';
import { ui } from '../i18n/ui';
import type { Scenario } from '../types';

export function CaseMetadata({ scenario, lang }: { scenario: Scenario; lang: Language }) {
  const t = translations[lang];
  const verified = ['проведено', 'verified'].includes(scenario.perevirka_zmistu.fakhivets_dzpk);
  const row = 'flex items-center gap-2 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider';
  return (
    <div className="case-metadata-strip w-full rounded-sm border border-steel-700/80 bg-obsidian-900/60 divide-y divide-steel-700/50">
      <div className={`${row} ${verified ? 'text-status-success' : 'text-status-warning'}`} title={scenario.perevirka_zmistu.prymitka}>
        {verified ? <ShieldCheck className="w-3 h-3 shrink-0" /> : <AlertCircle className="w-3 h-3 shrink-0" />}
        <span>{verified ? t.catalog.verified : t.catalog.unverified}</span>
      </div>
      {scenario.shi.vykorystano && (
        <div className={`${row} text-tactical-ice`} title={`${scenario.shi.instrument}: ${scenario.shi.shcho_zrobleno}`}>
          <Sparkles className="w-3 h-3 shrink-0" />
          <span>{ui(lang, 'm194')}</span>
        </div>
      )}
      <div className={`${row} text-steel-300`} title={scenario.dzherelo_vypadku.opys}>
        <FileCheck className="w-3 h-3 shrink-0" />
        <span>{['вигаданий', 'fictional'].includes(scenario.dzherelo_vypadku.typ) ? t.catalog.fictional : t.catalog.anonymized}</span>
      </div>
    </div>
  );
}
