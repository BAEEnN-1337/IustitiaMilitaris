import { caseLabel } from '../i18n/display';
import { localizeNorms } from '../i18n/content';
import { ui } from '../i18n/ui';
import React, { useState } from 'react';
import {
  BookOpen,
  Search,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Tag
} from 'lucide-react';
import { normyData as originalNorms, allScenarios } from '../data/scenarios';
import { NormEntry } from '../types';
import { NormDetailModal } from './NormDetailModal';
import { Language, translations } from '../i18n';

interface NormsLibraryProps {
  lang: Language;
}

export const NormsLibrary: React.FC<NormsLibraryProps> = ({ lang }) => {
  const normyData = localizeNorms(originalNorms, lang);
  const t = translations[lang];

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeNorm, setActiveNorm] = useState<NormEntry | null>(null);

  // Map norm id to scenarios that use it
  const usageMap: Record<string, string[]> = {};
  for (const s of allScenarios) {
    for (const n of s.normy || []) {
      if (!usageMap[n.id]) usageMap[n.id] = [];
      if (!usageMap[n.id].includes(s.id)) {
        usageMap[n.id].push(s.id);
      }
    }
  }

  const filteredNorms = normyData.normy
    .filter((n) => {
      const matchesSearch =
        n.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.akt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.punkt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.korotko.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' || n.status_zvirky === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => a.akt.localeCompare(b.akt));

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="steel-panel p-6 rounded-sm bg-obsidian-850 border border-steel-700 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="p-2 rounded-sm bg-tactical-ice/20 text-tactical-ice border border-tactical-ice/30">
              <BookOpen className="w-5 h-5" />
            </div>
            <h1 className="im-title font-serif text-xl sm:text-2xl font-bold text-white">
              {normyData.nazva}
            </h1>
          </div>
          <p className="text-xs text-steel-300 mt-1 max-w-2xl leading-relaxed">
            {normyData.prymitka}
          </p>
        </div>

        <div className="text-xs font-mono text-tactical-ice px-3 py-1.5 rounded-sm bg-obsidian-800 border border-steel-700 shrink-0">
          {ui(lang, 'm42')} {normyData.data_stanu} {ui(lang, 'm43')}{' '}
        </div>
      </div>
      <div className="steel-panel p-4 rounded-sm bg-obsidian-850 border border-obsidian-800 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-steel-300 absolute left-3 top-3" />
          <input
            type="text"
            placeholder={ui(lang, 'm44')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="im-field w-full bg-obsidian-950 border border-steel-700 rounded-sm pl-9 pr-4 py-2 text-xs text-white placeholder-steel-300 focus:outline-none focus:border-tactical-ice"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto text-xs">
          <span className="text-steel-300">{ui(lang, 'm45')} </span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="im-field bg-obsidian-950 border border-steel-700 text-steel-100 rounded-sm px-3 py-1.5 focus:outline-none focus:border-tactical-ice text-xs"
          >
            <option value="all">{ui(lang, 'm46')} </option>
            <option value="zvireno">{ui(lang, 'm47')} </option>
            <option value="zvireno-rekomendatsiinyi">{ui(lang, 'm48')} </option>
            <option value="ne-zvireno">{ui(lang, 'm49')} </option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredNorms.map((norm, index) => {
          const isVerified = norm.status_zvirky === 'zvireno';
          const isRecommended =
            norm.status_zvirky === 'zvireno-rekomendatsiinyi';
          const usedInScenarios = usageMap[norm.id] || [];

          return (
            <React.Fragment key={norm.id}>
              {(index === 0 || filteredNorms[index - 1].akt !== norm.akt) && (
                <h2 className="col-span-full font-serif text-xl font-bold mt-4">
                  {norm.akt}
                </h2>
              )}
              <div
                key={norm.id}
                onClick={() => setActiveNorm(norm)}
                className="steel-panel p-5 rounded-sm bg-obsidian-850 border border-obsidian-800 hover:border-tactical-ice/40 hover:bg-obsidian-850 transition-all cursor-pointer flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 gap-2">
                    <span className="im-tag font-mono text-xs font-bold px-2 py-0.5 rounded-sm bg-obsidian-800 text-tactical-ice border border-tactical-ice">
                      {norm.id}
                    </span>
                    <span
                      className={`im-tag text-[11px] px-2 py-0.5 rounded-sm border flex items-center gap-1 font-medium ${
                        isVerified
                          ? 'bg-status-success/10 text-status-success border-status-success/30'
                          : isRecommended
                            ? 'bg-tactical-ice/10 text-tactical-ice border-tactical-ice/30'
                            : 'bg-status-warning/10 text-status-warning border-status-warning/30'
                      }`}
                    >
                      {isVerified ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <AlertTriangle className="w-3 h-3" />
                      )}
                      {isVerified
                        ? ui(lang, 'm50')
                        : isRecommended
                          ? ui(lang, 'm51')
                          : ui(lang, 'm52')}
                    </span>
                  </div>

                  <h3 className="im-section-title font-bold text-sm text-white ">
                    {norm.akt}
                  </h3>
                  <div className="text-xs text-steel-300 font-medium">
                    {norm.punkt}
                  </div>
                  <p className="text-xs text-steel-300  leading-relaxed">
                    {norm.korotko}
                  </p>
                </div>

                <div className="pt-2 border-t border-obsidian-800 flex flex-wrap items-center justify-between gap-2 text-[11px] text-steel-300">
                  <span>{norm.redaktsiia}</span>
                  {usedInScenarios.length > 0 && (
                    <span className="flex items-center gap-1 text-status-success font-mono">
                      <Tag className="w-3 h-3" />
                      {usedInScenarios
                        .map((id) => caseLabel(id, lang))
                        .join(', ')}
                    </span>
                  )}
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
      <NormDetailModal norm={activeNorm} onClose={() => setActiveNorm(null)} />
    </div>
  );
};
