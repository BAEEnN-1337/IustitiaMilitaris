import React, { useId } from 'react';
import { AlertCircle, FileCheck, Sparkles } from 'lucide-react';
import { Language } from '../i18n';
import labels from '../i18n/caseBadges.json';
import type { Scenario } from '../types';

function MetadataBadge({ children, hint, color }: { children: React.ReactNode; hint: string; color: string }) {
  const id = useId();
  return (
    <div tabIndex={-1} onClick={event => { event.preventDefault(); event.stopPropagation(); }} aria-describedby={id} className={`case-badge relative cursor-help w-full flex items-center justify-center gap-1 px-1.5 py-1 text-center font-mono text-[10px] sm:text-[11px] uppercase tracking-wider rounded-sm border border-steel-700/80 bg-obsidian-850/90 transition-colors ${color}`}>
      {children}
      <span id={id} role="tooltip" className="case-badge-tooltip opacity-0 invisible transition-all duration-200 ease-out absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none w-52 sm:w-60 p-2.5 rounded-sm bg-obsidian-900 border border-steel-600 shadow-panel font-sans normal-case text-left text-[11px] text-steel-100 leading-snug tracking-normal">{hint}</span>
    </div>
  );
}

export function CaseMetadata({ scenario, lang }: { scenario: Scenario; lang: Language }) {
  const t = labels[lang];
  const fictional = ['вигаданий', 'fictional'].includes(scenario.dzherelo_vypadku.typ);
  const cids = /\bCIDS\b/i.test(scenario.dzherelo_vypadku.opys);
  const source = cids ? t.cids : fictional ? t.training : t.practice;
  const verified = ['проведено', 'verified'].includes(scenario.perevirka_zmistu.fakhivets_dzpk);
  return (
    <div className="case-metadata-strip grid grid-cols-3 gap-1.5 w-full mt-auto pt-3 overflow-visible">
      <MetadataBadge color={verified ? 'text-status-success' : 'text-status-warning'} hint={verified ? scenario.perevirka_zmistu.prymitka : t.draftHint}>
        <AlertCircle className="w-3 h-3 shrink-0" />
        <span>{verified ? t.verified : t.draft}</span>
      </MetadataBadge>
      {scenario.shi.vykorystano && (
        <MetadataBadge color="text-tactical-ice" hint={t.aiHint}>
          <Sparkles className="w-3 h-3 shrink-0" />
          <span>{t.ai}</span>
        </MetadataBadge>
      )}
      <MetadataBadge color="text-steel-300" hint={cids ? t.cidsHint : scenario.dzherelo_vypadku.opys}>
        <FileCheck className="w-3 h-3 shrink-0" />
        <span>{source}</span>
      </MetadataBadge>
    </div>
  );
}
