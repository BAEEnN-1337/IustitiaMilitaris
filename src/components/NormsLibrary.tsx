import { localizeNorms } from '../i18n/content';
import { ui } from '../i18n/ui';
import React, { useState } from 'react';
import { BookOpen, Search, ExternalLink, CheckCircle2, AlertTriangle, ShieldCheck, Tag } from 'lucide-react';
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

  const filteredNorms = normyData.normy.filter(n => {
    const matchesSearch =
      n.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.akt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.punkt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.korotko.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || n.status_zvirky === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-navy-900 border border-navy-700 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <BookOpen className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">
              {normyData.nazva}
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            {normyData.prymitka}
          </p>
        </div>

        <div className="text-xs font-mono text-cyan-300 px-3 py-1.5 rounded-lg bg-navy-800 border border-navy-700 shrink-0">
          {ui(lang, 'm42')}{' '}{normyData.data_stanu} {ui(lang, 'm43')}{' '}</div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-navy-900 border border-navy-800 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder={ui(lang, 'm44')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-navy-950 border border-navy-700 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto text-xs">
          <span className="text-slate-400">{ui(lang, 'm45')}{' '}</span>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-navy-950 border border-navy-700 text-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-cyan-500 text-xs"
          >
            <option value="all">{ui(lang, 'm46')}{' '}</option>
            <option value="zvireno">{ui(lang, 'm47')}{' '}</option>
            <option value="zvireno-rekomendatsiinyi">{ui(lang, 'm48')}{' '}</option>
            <option value="ne-zvireno">{ui(lang, 'm49')}{' '}</option>
          </select>
        </div>
      </div>

      {/* Norms Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredNorms.map((norm) => {
          const isVerified = norm.status_zvirky === 'zvireno';
          const isRecommended = norm.status_zvirky === 'zvireno-rekomendatsiinyi';
          const usedInScenarios = usageMap[norm.id] || [];

          return (
            <div
              key={norm.id}
              onClick={() => setActiveNorm(norm)}
              className="p-5 rounded-xl bg-navy-900 border border-navy-800 hover:border-cyan-500/40 hover:bg-navy-850 transition-all cursor-pointer flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 gap-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                    {norm.id}
                  </span>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full border flex items-center gap-1 font-medium ${
                    isVerified 
                      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' 
                      : isRecommended 
                      ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
                      : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                  }`}>
                    {isVerified ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                    {isVerified ? ui(lang, 'm50') : isRecommended ? ui(lang, 'm51') : ui(lang, 'm52')}
                  </span>
                </div>

                <h3 className="font-bold text-sm text-white ">
                  {norm.akt}
                </h3>
                <div className="text-xs text-slate-400 font-medium">
                  {norm.punkt}
                </div>
                <p className="text-xs text-slate-300  leading-relaxed">
                  {norm.korotko}
                </p>
              </div>

              <div className="pt-2 border-t border-navy-800 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                <span>{norm.redaktsiia}</span>
                {usedInScenarios.length > 0 && (
                  <span className="flex items-center gap-1 text-emerald-400 font-mono">
                    <Tag className="w-3 h-3" />
                    {usedInScenarios.join(', ')}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Norm Detail Modal */}
      <NormDetailModal
        norm={activeNorm}
        onClose={() => setActiveNorm(null)}
      />
    </div>
  );
};
