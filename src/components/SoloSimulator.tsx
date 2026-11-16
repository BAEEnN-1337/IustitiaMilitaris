import { localizeNorm, localizeScenario } from '../i18n/content';
import { ui } from '../i18n/ui';
import React, { useState } from 'react';
import { 
  ArrowLeft, ArrowRight, RotateCcw, Shield, HelpCircle, 
  ChevronDown, ChevronUp, User, CheckCircle2, AlertTriangle,
  Download, Scale, BookOpen, Layers
} from 'lucide-react';
import { Scenario, Variant, NormEntry } from '../types';
import { normMap as originalNormMap, normyData } from '../data/scenarios';
import { BalanceIndicators } from './BalanceIndicators';
import { CidsHelperModal } from './CidsHelperModal';
import { NormDetailModal } from './NormDetailModal';
import { DecisionTreeSvg } from './DecisionTreeSvg';
import { generateScorm12Zip } from '../utils/scormExport';
import { Language, translations } from '../i18n';

interface SoloSimulatorProps {
  scenario: Scenario;
  onBackToCatalog: () => void;
  lang: Language;
}

export const SoloSimulator: React.FC<SoloSimulatorProps> = ({
  scenario: sourceScenario,
  onBackToCatalog,
  lang
}) => {
  const scenario = localizeScenario(sourceScenario, lang);
  const normMap = new Map([...originalNormMap].map(([id, norm]) => [id, localizeNorm(norm, lang)]));
  const t = translations[lang];

  // Simulator stage: 'briefing' | 'decision' | 'feedback' | 'reflection'
  const [phase, setPhase] = useState<'briefing' | 'decision' | 'feedback' | 'reflection'>('briefing');
  const [currentNodeId, setCurrentNodeId] = useState<string>(scenario.pochatkovyi_vuzol);
  const [storedSelectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [storedPendingVariant, setPendingVariant] = useState<Variant | null>(null);

  // History pathway: array of { nodeId, variant }
  const [storedPathway, setPathway] = useState<{ nodeId: string; variant: Variant }[]>([]);

  // Resolve displayed text from stable IDs on every render, including after a
  // language change. Stored choices and progress do not need to be reset.
  const resolveVariant = (nodeId: string, variant: Variant | null) =>
    variant ? scenario.vuzly.find(n => n.id === nodeId)?.varianty.find(v => v.id === variant.id) ?? variant : null;
  const selectedVariant = resolveVariant(currentNodeId, storedSelectedVariant);
  const pendingVariant = resolveVariant(currentNodeId, storedPendingVariant);
  const pathway = storedPathway.map(step => ({
    ...step, variant: resolveVariant(step.nodeId, step.variant)!
  }));

  // Modals
  const [isCidsOpen, setIsCidsOpen] = useState(false);
  const [activeNormDetail, setActiveNormDetail] = useState<{ norm: NormEntry; note?: string } | null>(null);
  const [showValuesConflict, setShowValuesConflict] = useState(false);
  const [isExportingScorm, setIsExportingScorm] = useState(false);

  const saveLocalProgress = (newPathway: { nodeId: string; variant: Variant }[]) => {
    try {
      localStorage.setItem(`simulator_progress_${scenario.id}`, JSON.stringify({
        scenarioId: scenario.id,
        pathway: newPathway,
        timestamp: Date.now()
      }));
    } catch (e) {}
  };

  const handleStartFromBriefing = () => {
    setPhase('decision');
    setCurrentNodeId(scenario.pochatkovyi_vuzol);
    setSelectedVariant(null);
    setPendingVariant(null);
  };

  const handleConfirmDecision = () => {
    if (!pendingVariant) return;
    setSelectedVariant(pendingVariant);
    const newPathway = [...pathway, { nodeId: currentNodeId, variant: pendingVariant }];
    setPathway(newPathway);
    saveLocalProgress(newPathway);
    setPhase('feedback');
  };

  const handleNextStep = () => {
    if (!selectedVariant) return;

    if (selectedVariant.nastupnyi_vuzol) {
      setCurrentNodeId(selectedVariant.nastupnyi_vuzol);
      setSelectedVariant(null);
      setPendingVariant(null);
      setPhase('decision');
    } else {
      setPhase('reflection');
    }
  };

  const handleRestart = () => {
    localStorage.removeItem(`simulator_progress_${scenario.id}`);
    setPathway([]);
    setCurrentNodeId(scenario.pochatkovyi_vuzol);
    setSelectedVariant(null);
    setPendingVariant(null);
    setPhase('briefing');
  };

  const handleExportScorm = async () => {
    try {
      setIsExportingScorm(true);
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
      console.error('SCORM export error', err);
      alert(ui(lang, 'm213'));
    } finally {
      setIsExportingScorm(false);
    }
  };

  const openNormModal = (normId: string) => {
    const entry = normMap.get(normId);
    if (!entry) return;
    const scenNorm = scenario.normy.find(n => n.id === normId);
    setActiveNormDetail({ norm: entry, note: scenNorm?.yak_zastosovuietsia });
  };

  const currentNode = scenario.vuzly.find(v => v.id === currentNodeId);

  // Compute final separate balance points (no summing across axes!)
  const cumulativeScores = pathway.reduce(
    (acc, step) => ({
      dobrochesnist: acc.dobrochesnist + step.variant.baly.dobrochesnist,
      efektyvnist: acc.efektyvnist + step.variant.baly.efektyvnist,
      dovira: acc.dovira + step.variant.baly.dovira,
    }),
    { dobrochesnist: 0, efektyvnist: 0, dovira: 0 }
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-6 border-b border-navy-800">
        <button
          onClick={onBackToCatalog}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t.briefing.backToCatalog}
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-navy-800 text-emerald-400 border border-navy-700">
            {scenario.id}
          </span>
          <span className="text-xs text-slate-300 font-medium">
            {scenario.nazva}
          </span>
        </div>
      </div>
      {phase === 'briefing' && (
        <div key={`${scenario.id}:${phase}:${currentNodeId}`} className="space-y-6 animate-fadeIn">
          <div className="p-6 sm:p-8 rounded-2xl bg-navy-900 border border-navy-700 shadow-xl space-y-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                {t.briefing.title}
              </span>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white mt-1">
                {scenario.nazva}
              </h1>
            </div>
            <div className="p-4 rounded-xl bg-navy-950/80 border-l-4 border-indigo-500 text-sm text-slate-200 leading-relaxed">
              <strong className="text-indigo-300 block mb-1">{ui(lang, 'm214')}{' '}</strong>
              {scenario.kontekst}
            </div>
            <div className="space-y-2">
              <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                {t.briefing.situationTitle}
              </h2>
              <div className="p-4 rounded-xl bg-navy-850 border border-navy-750 text-sm sm:text-base text-slate-100 leading-relaxed">
                {scenario.sytuatsiia}
              </div>
            </div>
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex flex-wrap items-center gap-2">
                <User className="w-4 h-4 text-emerald-400" />
                {t.briefing.rolesTitle}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {scenario.diiovi_osoby.map((role) => (
                  <div
                    key={role.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      role.hravets
                        ? 'bg-emerald-500/10 border-emerald-500/50 shadow-sm'
                        : 'bg-navy-950 border-navy-800'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                      <span className="font-semibold text-sm text-white">
                        {role.rol}
                      </span>
                      {role.hravets && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {t.briefing.playerBadge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {role.opys}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-navy-750 overflow-hidden bg-navy-950">
              <button
                onClick={() => setShowValuesConflict(!showValuesConflict)}
                className="w-full p-4 flex flex-wrap items-center justify-between gap-2 text-left text-sm font-semibold text-amber-300 hover:bg-navy-900 transition-colors"
              >
                <span className="flex flex-wrap items-center gap-2">
                  <Scale className="w-4 h-4 text-amber-400" />
                  {t.briefing.valuesConflictTitle}
                </span>
                {showValuesConflict ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showValuesConflict && (
                <div className="animate-fadeIn p-4 border-t border-navy-800 space-y-3 text-xs sm:text-sm">
                  {scenario.tsinnosti_v_konflikti.map((c, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-navy-900 border border-navy-800">
                      <div className="font-bold text-amber-300 flex flex-wrap items-center gap-2 mb-1">
                        <span>{c.tsinnist_a}</span>
                        <span className="text-slate-500">↔</span>
                        <span>{c.tsinnist_b}</span>
                      </div>
                      <p className="text-slate-300 leading-relaxed">{c.poiasnennia}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={handleStartFromBriefing}
              className="w-full py-3.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm sm:text-base transition-all shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2"
            >
              <span>{t.briefing.startScenario}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
      {phase === 'decision' && currentNode && (
        <div key={`${scenario.id}:${phase}:${currentNodeId}`} className="space-y-6 animate-fadeIn">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-400">
              <span className="px-2.5 py-1 rounded bg-navy-800 text-emerald-400 border border-emerald-500/30 font-mono">
                {currentNode.id}
              </span>
              <span>
                {t.step.stepLabel} {pathway.length + 1}
              </span>
            </div>
            <button
              onClick={() => setIsCidsOpen(true)}
              className="inline-flex flex-wrap items-center gap-2 px-3.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-colors"
            >
              <Scale className="w-4 h-4 text-amber-400" />
              {t.step.cidsHelperBtn}
            </button>
          </div>

          <div className="p-6 sm:p-8 rounded-2xl bg-navy-900 border border-navy-700 shadow-xl space-y-6">
            {currentNode.tekst && (
              <div className="p-4 rounded-xl bg-navy-950 border border-navy-800 text-sm text-slate-200 leading-relaxed">
                {currentNode.tekst}
              </div>
            )}
            <div>
              <h2 className="text-base sm:text-xl font-bold text-white leading-snug">
                {currentNode.zapytannia}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {t.step.selectPrompt}
              </p>
            </div>
            <div className="space-y-3">
              {currentNode.varianty.map((v) => {
                const isSelected = pendingVariant?.id === v.id;
                return (
                  <div
                    key={v.id}
                    onClick={() => setPendingVariant(v)}
                    className={`p-4 sm:p-5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-md shadow-emerald-950/40'
                        : 'bg-navy-950/70 border-navy-800 text-slate-300 hover:bg-navy-850 hover:border-navy-700'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                        isSelected 
                          ? 'bg-emerald-500 text-navy-950' 
                          : 'bg-navy-800 text-slate-300 border border-navy-700'
                      }`}>
                        {v.id}
                      </span>
                      <div className="text-sm sm:text-base leading-relaxed">
                        {v.tekst}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <button
              onClick={handleConfirmDecision}
              disabled={!pendingVariant}
              className={`w-full py-3 px-6 rounded-xl font-bold text-sm sm:text-base transition-all flex items-center justify-center gap-2 ${
                pendingVariant
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg cursor-pointer'
                  : 'bg-navy-800 text-slate-500 border border-navy-700 cursor-not-allowed'
              }`}
            >
              <span>{pendingVariant ? t.step.confirmChoice : t.step.selectToContinue}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
      {phase === 'feedback' && selectedVariant && (
        <div key={`${scenario.id}:${phase}:${currentNodeId}`} className="space-y-6 animate-fadeIn">
          <div className="p-6 sm:p-8 rounded-2xl bg-navy-900 border border-navy-700 shadow-xl space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-navy-800">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                {t.feedback.title}
              </span>
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {ui(lang, 'm215')}{' '}{selectedVariant.id}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-navy-950 border border-navy-800 space-y-1.5">
                <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                  {t.feedback.immediateTitle}
                </div>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                  {selectedVariant.naslidky.odrazu}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-navy-950 border border-navy-800 space-y-1.5">
                <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                  {t.feedback.delayedTitle}
                </div>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                  {selectedVariant.naslidky.vidkladeni}
                </p>
              </div>
            </div>
            <BalanceIndicators
              scores={selectedVariant.baly}
              explanation={selectedVariant.chomu_taki_baly}
              lang={lang}
            />
            <div className="p-4 rounded-xl bg-navy-950 border-l-4 border-emerald-500 text-xs sm:text-sm text-slate-200 leading-relaxed">
              <strong className="text-emerald-400 block mb-1">
                {t.feedback.analysisTitle}
              </strong>
              {selectedVariant.zvorotnyi_zviazok}
            </div>
            {selectedVariant.normy && selectedVariant.normy.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" />
                  {t.feedback.normsTitle}
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedVariant.normy.map((normId) => {
                    const n = normMap.get(normId);
                    return (
                      <button
                        key={normId}
                        onClick={() => openNormModal(normId)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-medium transition-colors"
                      >
                        <span className="font-mono font-bold">{normId}</span>
                        {n && <span className="text-[11px] text-slate-400 break-words">{n.punkt}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <button
              onClick={handleNextStep}
              className="w-full py-3.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm sm:text-base transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <span>{selectedVariant.nastupnyi_vuzol ? t.feedback.nextStep : t.feedback.finishScenario}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
      {phase === 'reflection' && (
        <div key={`${scenario.id}:${phase}:${currentNodeId}`} className="space-y-6 animate-fadeIn">
          <div className="p-6 sm:p-8 rounded-2xl bg-navy-900 border border-navy-700 shadow-xl space-y-6">
            <div className="border-b border-navy-800 pb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  {t.reflection.title}
                </span>
                <h1 className="text-xl sm:text-2xl font-extrabold text-white mt-1">
                  {scenario.nazva}
                </h1>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold">
                {ui(lang, 'm216')}{' '}</span>
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex flex-wrap items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                {t.reflection.pathwayTitle}
              </h3>
              <DecisionTreeSvg
                scenario={scenario}
                visitedNodeIds={pathway.map(p => p.nodeId)}
              />
            </div>
            <div className="space-y-2">
              {pathway.map((p, idx) => (
                <div key={idx} className="p-3.5 rounded-lg bg-navy-950 border border-navy-800 flex items-start justify-between gap-3 text-xs sm:text-sm">
                  <div>
                    <span className="font-mono font-bold text-emerald-400 mr-2">{ui(lang, 'm217')}{' '}{p.nodeId}</span>
                    <span className="font-semibold text-white">{ui(lang, 'm218')}{' '}{p.variant.id}:</span>
                    <p className="text-slate-300 mt-1">{p.variant.tekst}</p>
                  </div>
                  <div className="flex items-center gap-1 font-mono text-[11px] shrink-0 ml-4">
                    <span className="text-emerald-400">{ui(lang, 'm219')}{' '}{p.variant.baly.dobrochesnist > 0 ? `+${p.variant.baly.dobrochesnist}` : p.variant.baly.dobrochesnist}</span>
                    <span className="text-amber-400 ml-1">{ui(lang, 'm220')}{' '}{p.variant.baly.efektyvnist > 0 ? `+${p.variant.baly.efektyvnist}` : p.variant.baly.efektyvnist}</span>
                    <span className="text-cyan-400 ml-1">{ui(lang, 'm221')}{' '}{p.variant.baly.dovira > 0 ? `+${p.variant.baly.dovira}` : p.variant.baly.dovira}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                {t.reflection.profileTitle}
              </h3>
              <BalanceIndicators
                scores={cumulativeScores}
                lang={lang}
                showExplanation={false}
              />
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                {t.reflection.profileNotice}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-navy-950 border border-navy-800 space-y-1.5 text-xs sm:text-sm">
              <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                {t.reflection.applicabilityTitle}
              </h3>
              <p className="text-slate-300 leading-relaxed">
                {scenario.zastosovnist}
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider">
                {t.reflection.adviceTitle}
              </h3>
              <ul className="space-y-2">
                {scenario.porady.map((advice, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{advice}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-300 flex flex-wrap items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{t.reflection.privacyBanner}</span>
            </div>
            <div className="pt-4 border-t border-navy-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                onClick={handleRestart}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-navy-800 hover:bg-navy-700 text-white font-semibold text-xs transition-colors border border-navy-700"
              >
                <RotateCcw className="w-4 h-4 text-emerald-400" />
                {t.reflection.restartBtn}
              </button>

              <button
                onClick={handleExportScorm}
                disabled={isExportingScorm}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors shadow-md"
              >
                <Download className="w-4 h-4" />
                {isExportingScorm ? ui(lang, 'm222') : t.reflection.exportScormBtn}
              </button>
            </div>
          </div>
        </div>
      )}
      <CidsHelperModal
        isOpen={isCidsOpen}
        onClose={() => setIsCidsOpen(false)}
        lang={lang}
      />
      <NormDetailModal
        norm={activeNormDetail?.norm || null}
        yakZastosovuietsia={scenario.normy.find(n => n.id === activeNormDetail?.norm.id)?.yak_zastosovuietsia ?? activeNormDetail?.note}
        onClose={() => setActiveNormDetail(null)}
      />
    </div>
  );
};
