import { localizeScenario } from '../i18n/content';
import { ui } from '../i18n/ui';
import React, { useState } from 'react';
import { 
  Play, Users, Download, Clock, Layers, Award, Sparkles, 
  HelpCircle, Search, ShieldCheck, AlertCircle, FileCheck
} from 'lucide-react';
import { Scenario } from '../types';
import { teamScenarios, starterExamples, normyData } from '../data/scenarios';
import { generateScorm12Zip } from '../utils/scormExport';
import { Language, translations } from '../i18n';

interface ScenarioCatalogProps {
  onStartSolo: (scenario: Scenario) => void;
  onStartClassroom: (scenario: Scenario) => void;
  lang: Language;
}

export const ScenarioCatalog: React.FC<ScenarioCatalogProps> = ({
  onStartSolo,
  onStartClassroom,
  lang
}) => {
  const t = translations[lang];
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTheme, setSelectedTheme] = useState<string>('all');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const filterScenarios = (list: Scenario[]) => {
    return list.map(s => localizeScenario(s, lang)).filter(s => {
      const matchesSearch = 
        s.nazva.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.kontekst.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.audytoriia.some(a => a.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesTheme = selectedTheme === 'all' || s.tema === selectedTheme;
      return matchesSearch && matchesTheme;
    });
  };

  const handleExportScorm = async (scenario: Scenario) => {
    try {
      setDownloadingId(scenario.id);
      const zipBlob = await generateScorm12Zip(scenario, normyData, lang);
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${scenario.id}-scorm12.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('SCORM Export failed', err);
      alert(ui(lang, 'm181'));
    } finally {
      setDownloadingId(null);
    }
  };

  const getThemeLabel = (tema: string) => {
    const map: Record<string, string> = {
      'podarunok': ui(lang, 'm182'),
      'konflikt-interesiv': ui(lang, 'm183'),
      'vykryvach': ui(lang, 'm184'),
      'akademichna-dobrochesnist': ui(lang, 'm185'),
      'sluzhbove-maino': ui(lang, 'm186'),
      'kadrovi-rishennia': ui(lang, 'm187'),
      'neformalnyi-tysk': ui(lang, 'm188'),
      'rozpodil-resursiv': ui(lang, 'm189'),
      'pravdyvist-zvitiv': ui(lang, 'm190'),
      'inshe': ui(lang, 'm191')
    };
    return map[tema] || tema;
  };

  const renderScenarioCard = (s: Scenario, isTeam: boolean) => {
    const stageCount = s.vuzly.length;
    const isVerified = ['проведено', 'verified'].includes(s.perevirka_zmistu.fakhivets_dzpk);
    const isPending = ['не проведено', 'pending'].includes(s.perevirka_zmistu.fakhivets_dzpk);

    return (
      <div 
        key={s.id}
        className={`flex flex-col justify-between rounded-xl bg-navy-900 border transition-all duration-200 hover:shadow-xl hover:translate-y-[-2px] ${
          isTeam 
            ? 'border-emerald-500/30 hover:border-emerald-500/60 shadow-emerald-950/20' 
            : 'border-navy-700 hover:border-navy-600'
        }`}
      >
        <div className="p-5 sm:p-6 space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`font-mono text-xs font-bold px-2.5 py-1 rounded-md border ${
                isTeam 
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                  : 'bg-navy-800 text-slate-300 border-navy-700'
              }`}>
                {s.id}
              </span>
              <span className="text-xs px-2.5 py-1 rounded-md bg-navy-850 text-indigo-300 border border-indigo-500/20 font-medium">
                {getThemeLabel(s.tema)}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span className="flex items-center gap-1" title={ui(lang, 'm192')}>
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                {s.tryvalist_khv} {t.catalog.minutes}
              </span>
              <span className="flex items-center gap-1" title={ui(lang, 'm193')}>
                <Layers className="w-3.5 h-3.5 text-slate-500" />
                {stageCount} {t.catalog.stagesCount}
              </span>
            </div>
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-emerald-400 transition-colors leading-snug">
              {s.nazva}
            </h3>
            <p className="text-xs text-slate-400 mt-2  leading-relaxed">
              {s.sytuatsiia}
            </p>
          </div>
          <div className="pt-2 border-t border-navy-800 flex flex-wrap items-center gap-2 text-[11px]">
            <span 
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border ${
                isVerified 
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' 
                  : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
              }`}
              title={s.perevirka_zmistu.prymitka}
            >
              {isVerified ? <ShieldCheck className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
              {isVerified ? t.catalog.verified : t.catalog.unverified}
            </span>
            {s.shi.vykorystano && (
              <span 
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/30"
                title={`${s.shi.instrument}: ${s.shi.shcho_zrobleno}`}
              >
                <Sparkles className="w-3 h-3" />
                {ui(lang, 'm194')}{' '}</span>
            )}
            <span 
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-navy-800 text-slate-400 border border-navy-700"
              title={s.dzherelo_vypadku.opys}
            >
              <FileCheck className="w-3 h-3 text-slate-500" />
              {['вигаданий', 'fictional'].includes(s.dzherelo_vypadku.typ) ? t.catalog.fictional : t.catalog.anonymized}
            </span>
          </div>
          <div className="text-[11px] text-slate-400">
            <span className="text-slate-400 font-semibold">{t.catalog.audience}: </span>
            <span className="">{s.audytoriia.join(', ')}</span>
          </div>
        </div>
        <div className="p-4 bg-navy-950/70 border-t border-navy-800/80 rounded-b-xl flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => onStartSolo(s)}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors shadow-sm"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {t.catalog.startSolo}
            </button>
            <button
              onClick={() => onStartClassroom(s)}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-navy-800 hover:bg-navy-700 text-indigo-300 hover:text-white border border-indigo-500/30 font-medium text-xs transition-colors"
            >
              <Users className="w-3.5 h-3.5" />
              {t.catalog.startClassroom}
            </button>
          </div>

          <button
            onClick={() => handleExportScorm(s)}
            disabled={downloadingId === s.id}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-navy-850 hover:bg-navy-800 text-slate-400 hover:text-slate-200 border border-navy-700 text-[11px] font-medium transition-colors"
            title={ui(lang, 'm195')}
          >
            <Download className="w-3.5 h-3.5" />
            {downloadingId === s.id ? ui(lang, 'm196') : 'SCORM 1.2'}
          </button>
        </div>
      </div>
    );
  };

  const filteredTeam = filterScenarios(teamScenarios);
  const filteredStarter = filterScenarios(starterExamples);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="inline-flex flex-wrap items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
          <Award className="w-4 h-4" />
          {ui(lang, 'm197')}{' '}</div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
          {t.appTitle}
        </h1>
        <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
          {t.appSubtitle}{ui(lang, 'm198')}{' '}</p>
      </div>
      <div className="p-4 rounded-xl bg-navy-900 border border-navy-800 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder={ui(lang, 'm199')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-navy-950 border border-navy-700 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 text-xs">
          <span className="text-slate-400 text-xs shrink-0">{t.catalog.theme}:</span>
          <select
            value={selectedTheme}
            onChange={e => setSelectedTheme(e.target.value)}
            className="bg-navy-950 border border-navy-700 text-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-emerald-500 text-xs"
          >
            <option value="all">{ui(lang, 'm200')}{' '}</option>
            <option value="vykryvach">{ui(lang, 'm201')}{' '}</option>
            <option value="sluzhbove-maino">{ui(lang, 'm202')}{' '}</option>
            <option value="kadrovi-rishennia">{ui(lang, 'm203')}{' '}</option>
            <option value="podarunok">{ui(lang, 'm204')}{' '}</option>
            <option value="konflikt-interesiv">{ui(lang, 'm205')}{' '}</option>
            <option value="akademichna-dobrochesnist">{ui(lang, 'm206')}{' '}</option>
          </select>
        </div>
      </div>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-500/30 pb-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-white flex flex-wrap items-center gap-2">
                <Award className="w-5 h-5 text-emerald-400" />
                {t.catalog.teamScenariosTitle}
              </h2>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {ui(lang, 'm207')}{' '}</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {t.catalog.teamScenariosDesc}
            </p>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {filteredTeam.length} {ui(lang, 'm208')}{' '}{teamScenarios.length}
          </span>
        </div>

        {filteredTeam.length === 0 ? (
          <div className="p-8 text-center text-slate-500 bg-navy-900 rounded-xl border border-navy-800 text-sm">
            {ui(lang, 'm209')}{' '}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredTeam.map(s => renderScenarioCard(s, true))}
          </div>
        )}
      </div>
      <div className="space-y-4 pt-6 border-t border-navy-800">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-navy-800 pb-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-300 flex flex-wrap items-center gap-2">
                <HelpCircle className="w-5 h-5 text-slate-500" />
                {t.catalog.starterExamplesTitle}
              </h2>
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-navy-800 text-slate-400 border border-navy-700">
                {ui(lang, 'm210')}{' '}</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {t.catalog.starterExamplesDesc}
            </p>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {filteredStarter.length} {ui(lang, 'm211')}{' '}{starterExamples.length}
          </span>
        </div>

        {filteredStarter.length === 0 ? (
          <div className="p-8 text-center text-slate-500 bg-navy-900 rounded-xl border border-navy-800 text-sm">
            {ui(lang, 'm212')}{' '}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredStarter.map(s => renderScenarioCard(s, false))}
          </div>
        )}
      </div>
    </div>
  );
};
