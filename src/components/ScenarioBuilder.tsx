import { localizeScenario } from '../i18n/content';
import { ui } from '../i18n/ui';
import React, { useState } from 'react';
import { 
  Wrench, CheckCircle2, AlertTriangle, Download, Upload, 
  Play, Plus, Trash2, Layers, BookOpen, User, Scale, ShieldCheck,
  FileCode, Sparkles
} from 'lucide-react';
import { Scenario, Node, Variant, Role, ValueConflict, ScenarioNorm } from '../types';
import { normyData } from '../data/scenarios';
import { validateScenario } from '../utils/validator';
import { DecisionTreeSvg } from './DecisionTreeSvg';
import { generateScorm12Zip } from '../utils/scormExport';
import { Language, translations } from '../i18n';

interface ScenarioBuilderProps {
  onTestScenario: (scenario: Scenario) => void;
  lang: Language;
}

export const ScenarioBuilder: React.FC<ScenarioBuilderProps> = ({
  onTestScenario,
  lang
}) => {
  const t = translations[lang];

  // Active builder tab: 'general' | 'roles' | 'nodes' | 'verification' | 'graph'
  const [activeTab, setActiveTab] = useState<'general' | 'roles' | 'nodes' | 'verification' | 'graph'>('general');

  // Initial template scenario
  const [scenario, setScenario] = useState<Scenario>({
    id: "S09",
    nazva: ui(lang, 'm53'),
    versiia: "1.0",
    data_stvorennia: "2026-11-16",
    tema: "konflikt-interesiv",
    audytoriia: [ui(lang, 'm54'), ui(lang, 'm55')],
    tryvalist_khv: 20,
    kontekst: ui(lang, 'm56'),
    diiovi_osoby: [
      { id: "R1", rol: ui(lang, 'm57'), opys: ui(lang, 'm58'), hravets: true },
      { id: "R2", rol: ui(lang, 'm59'), opys: ui(lang, 'm60'), hravets: false }
    ],
    sytuatsiia: ui(lang, 'm61'),
    tsinnosti_v_konflikti: [
      { tsinnist_a: ui(lang, 'm62'), tsinnist_b: ui(lang, 'm63'), poiasnennia: ui(lang, 'm64') }
    ],
    pochatkovyi_vuzol: "V1",
    vuzly: [
      {
        id: "V1",
        tekst: "",
        zapytannia: ui(lang, 'm65'),
        varianty: [
          {
            id: "A",
            tekst: ui(lang, 'm66'),
            naslidky: { odrazu: ui(lang, 'm67'), vidkladeni: ui(lang, 'm68') },
            baly: { dobrochesnist: 2, efektyvnist: 0, dovira: 1 },
            chomu_taki_baly: ui(lang, 'm69'),
            zvorotnyi_zviazok: ui(lang, 'm70'),
            normy: ["ZPK-28"],
            nastupnyi_vuzol: "V2"
          },
          {
            id: "B",
            tekst: ui(lang, 'm71'),
            naslidky: { odrazu: ui(lang, 'm72'), vidkladeni: ui(lang, 'm73') },
            baly: { dobrochesnist: -1, efektyvnist: 1, dovira: -1 },
            chomu_taki_baly: ui(lang, 'm74'),
            zvorotnyi_zviazok: ui(lang, 'm75'),
            normy: ["ZPK-42"],
            nastupnyi_vuzol: null
          },
          {
            id: "C",
            tekst: ui(lang, 'm76'),
            naslidky: { odrazu: ui(lang, 'm77'), vidkladeni: ui(lang, 'm78') },
            baly: { dobrochesnist: 2, efektyvnist: 1, dovira: 2 },
            chomu_taki_baly: ui(lang, 'm79'),
            zvorotnyi_zviazok: ui(lang, 'm80'),
            normy: ["ZPK-28", "ZPK-44"],
            nastupnyi_vuzol: null
          }
        ]
      },
      {
        id: "V2",
        tekst: ui(lang, 'm81'),
        zapytannia: ui(lang, 'm82'),
        varianty: [
          {
            id: "E1",
            tekst: ui(lang, 'm83'),
            naslidky: { odrazu: ui(lang, 'm84'), vidkladeni: ui(lang, 'm85') },
            baly: { dobrochesnist: 2, efektyvnist: 1, dovira: 1 },
            chomu_taki_baly: ui(lang, 'm86'),
            zvorotnyi_zviazok: ui(lang, 'm87'),
            normy: ["ZPK-28"],
            nastupnyi_vuzol: null
          },
          {
            id: "E2",
            tekst: ui(lang, 'm88'),
            naslidky: { odrazu: ui(lang, 'm89'), vidkladeni: ui(lang, 'm90') },
            baly: { dobrochesnist: -2, efektyvnist: 0, dovira: -2 },
            chomu_taki_baly: ui(lang, 'm91'),
            zvorotnyi_zviazok: ui(lang, 'm92'),
            normy: ["ZPK-41"],
            nastupnyi_vuzol: null
          }
        ]
      }
    ],
    normy: [
      { id: "ZPK-28", yak_zastosovuietsia: ui(lang, 'm93') },
      { id: "ZPK-41", yak_zastosovuietsia: ui(lang, 'm94') },
      { id: "ZPK-42", yak_zastosovuietsia: ui(lang, 'm95') },
      { id: "ZPK-44", yak_zastosovuietsia: ui(lang, 'm96') }
    ],
    zastosovnist: ui(lang, 'm97'),
    porady: [
      ui(lang, 'm98'),
      ui(lang, 'm99')
    ],
    pytannia_dlia_obhovorennia: [
      ui(lang, 'm100'),
      ui(lang, 'm101')
    ],
    dzherelo_vypadku: { typ: "вигаданий", opys: ui(lang, 'm102') },
    perevirka_zmistu: { fakhivets_dzpk: "не проведено", khto: null, data: null, prymitka: ui(lang, 'm103') },
    shi: { vykorystano: false, instrument: null, shcho_zrobleno: ui(lang, 'm104'), perevirka_liudynoiu: ui(lang, 'm105') }
  });

  const [selectedNodeIdx, setSelectedNodeIdx] = useState<number>(0);
  const [validationRequested, setValidationRequested] = useState(false);
  const validationErrors = validationRequested ? validateScenario(scenario, normyData, lang) : [];

  // Run validation
  const runValidation = () => {
    const errors = validateScenario(scenario, normyData, lang);
    setValidationRequested(true);
    return errors.length === 0;
  };

  const handleDownloadJson = () => {
    const isValid = runValidation();
    if (!isValid && !confirm(ui(lang, 'm106'))) {
      return;
    }
    const jsonStr = JSON.stringify(scenario, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${scenario.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        setScenario(parsed);
        const errors = validateScenario(parsed, normyData, lang);
        setValidationRequested(true);
        alert(ui(lang, 'm107', parsed.nazva || file.name));
      } catch (err) {
        alert(ui(lang, 'm108'));
      }
    };
    reader.readAsText(file);
  };

  const handleTestInSimulator = () => {
    const isValid = runValidation();
    if (!isValid) {
      alert(ui(lang, 'm109', validationErrors.length));
      return;
    }
    onTestScenario(localizeScenario(scenario, lang));
  };

  const handleExportScorm = async () => {
    const isValid = runValidation();
    if (!isValid) {
      alert(ui(lang, 'm110'));
      return;
    }
    try {
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
      alert(ui(lang, 'm111'));
    }
  };

  const addNode = () => {
    const nextIdx = scenario.vuzly.length + 1;
    const newId = `V${nextIdx}`;
    const newNode: Node = {
      id: newId,
      tekst: ui(lang, 'm112'),
      zapytannia: ui(lang, 'm113'),
      varianty: [
        {
          id: `X${nextIdx}1`,
          tekst: ui(lang, 'm114'),
          naslidky: { odrazu: ui(lang, 'm115'), vidkladeni: ui(lang, 'm116') },
          baly: { dobrochesnist: 1, efektyvnist: 1, dovira: 1 },
          chomu_taki_baly: ui(lang, 'm117'),
          zvorotnyi_zviazok: ui(lang, 'm118'),
          normy: [],
          nastupnyi_vuzol: null
        },
        {
          id: `X${nextIdx}2`,
          tekst: ui(lang, 'm119'),
          naslidky: { odrazu: ui(lang, 'm120'), vidkladeni: ui(lang, 'm121') },
          baly: { dobrochesnist: -1, efektyvnist: 0, dovira: -1 },
          chomu_taki_baly: ui(lang, 'm122'),
          zvorotnyi_zviazok: ui(lang, 'm123'),
          normy: [],
          nastupnyi_vuzol: null
        }
      ]
    };
    setScenario(prev => ({ ...prev, vuzly: [...prev.vuzly, newNode] }));
    setSelectedNodeIdx(scenario.vuzly.length);
  };

  const removeNode = (idx: number) => {
    if (scenario.vuzly.length <= 1) {
      alert(ui(lang, 'm124'));
      return;
    }
    setScenario(prev => ({
      ...prev,
      vuzly: prev.vuzly.filter((_, i) => i !== idx)
    }));
    setSelectedNodeIdx(Math.max(0, idx - 1));
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="p-6 rounded-2xl bg-navy-900 border border-navy-700 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Wrench className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">
              {t.builder.title}
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {t.builder.subtitle}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            onClick={runValidation}
            className="px-3.5 py-2 rounded-lg bg-navy-800 hover:bg-navy-700 text-slate-200 border border-navy-700 font-semibold text-xs transition-colors flex items-center gap-1.5"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            {t.builder.validateBtn}
          </button>

          <button
            onClick={handleTestInSimulator}
            className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow"
          >
            <Play className="w-4 h-4 fill-current" />
            {t.builder.testNowBtn}
          </button>

          <button
            onClick={handleDownloadJson}
            className="px-3 py-2 rounded-lg bg-navy-850 hover:bg-navy-800 text-slate-300 border border-navy-700 text-xs font-medium transition-colors flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            {t.builder.exportJsonBtn}
          </button>

          <label className="px-3 py-2 rounded-lg bg-navy-850 hover:bg-navy-800 text-slate-300 border border-navy-700 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer">
            <Upload className="w-4 h-4" />
            {t.builder.importJsonBtn}
            <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
          </label>

          <button
            onClick={handleExportScorm}
            className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow"
          >
            <Download className="w-4 h-4" />
            SCORM 1.2
          </button>
        </div>
      </div>
      {validationErrors.length > 0 ? (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-1">
          <div className="font-bold flex flex-wrap items-center gap-2 text-rose-400">
            <AlertTriangle className="w-4 h-4" />
            {ui(lang, 'm125')}{' '}{validationErrors.length} {ui(lang, 'm126')}{' '}</div>
          <ul className="list-disc pl-5 space-y-0.5">
            {validationErrors.map((err, idx) => (
              <li key={idx}><strong>{err.field}:</strong> {err.message}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex flex-wrap items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{ui(lang, 'm127')}{' '}</span>
        </div>
      )}
      <div className="flex border-b border-navy-800 gap-1 overflow-x-auto text-xs font-semibold">
        {[
          { id: 'general', label: t.builder.mainInfoTab, icon: FileCode },
          { id: 'roles', label: t.builder.rolesTab, icon: User },
          { id: 'nodes', label: t.builder.nodesTab, icon: Layers },
          { id: 'verification', label: t.builder.verificationTab, icon: Sparkles },
          { id: 'graph', label: t.builder.visualGraphTab, icon: Layers },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-t-lg transition-colors flex flex-wrap items-center gap-2 border-t border-x ${
                isActive
                  ? 'bg-navy-900 border-navy-700 text-emerald-400 font-bold'
                  : 'bg-navy-950 border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>
      <div className="p-6 sm:p-8 rounded-2xl bg-navy-900 border border-navy-700 shadow-xl space-y-6">
        {activeTab === 'general' && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-slate-300 font-bold mb-1">ID (S01..S99):</label>
                <input
                  type="text"
                  value={scenario.id}
                  onChange={e => setScenario({ ...scenario, id: e.target.value })}
                  className="w-full bg-navy-950 border border-navy-700 rounded-lg p-2.5 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-bold mb-1">{ui(lang, 'm128')}{' '}</label>
                <input
                  type="text"
                  value={scenario.versiia}
                  onChange={e => setScenario({ ...scenario, versiia: e.target.value })}
                  className="w-full bg-navy-950 border border-navy-700 rounded-lg p-2.5 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-bold mb-1">{ui(lang, 'm129')}{' '}</label>
                <input
                  type="text"
                  value={scenario.data_stvorennia}
                  onChange={e => setScenario({ ...scenario, data_stvorennia: e.target.value })}
                  className="w-full bg-navy-950 border border-navy-700 rounded-lg p-2.5 text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1">{ui(lang, 'm130')}{' '}</label>
              <input
                type="text"
                value={scenario.nazva}
                onChange={e => setScenario({ ...scenario, nazva: e.target.value })}
                className="w-full bg-navy-950 border border-navy-700 rounded-lg p-2.5 text-white text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-bold mb-1">{ui(lang, 'm131')}{' '}</label>
                <select
                  value={scenario.tema}
                  onChange={e => setScenario({ ...scenario, tema: e.target.value })}
                  className="w-full bg-navy-950 border border-navy-700 rounded-lg p-2.5 text-white"
                >
                  <option value="podarunok">{ui(lang, 'm132')}{' '}</option>
                  <option value="konflikt-interesiv">{ui(lang, 'm133')}{' '}</option>
                  <option value="vykryvach">{ui(lang, 'm134')}{' '}</option>
                  <option value="akademichna-dobrochesnist">{ui(lang, 'm135')}{' '}</option>
                  <option value="sluzhbove-maino">{ui(lang, 'm136')}{' '}</option>
                  <option value="kadrovi-rishennia">{ui(lang, 'm137')}{' '}</option>
                  <option value="neformalnyi-tysk">{ui(lang, 'm138')}{' '}</option>
                  <option value="rozpodil-resursiv">{ui(lang, 'm139')}{' '}</option>
                  <option value="pravdyvist-zvitiv">{ui(lang, 'm140')}{' '}</option>
                  <option value="inshe">{ui(lang, 'm141')}{' '}</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">{ui(lang, 'm142')}{' '}</label>
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={scenario.tryvalist_khv}
                  onChange={e => setScenario({ ...scenario, tryvalist_khv: parseInt(e.target.value) || 20 })}
                  className="w-full bg-navy-950 border border-navy-700 rounded-lg p-2.5 text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1">{ui(lang, 'm143')}{' '}</label>
              <textarea
                rows={3}
                value={scenario.kontekst}
                onChange={e => setScenario({ ...scenario, kontekst: e.target.value })}
                className="w-full bg-navy-950 border border-navy-700 rounded-lg p-2.5 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1">{ui(lang, 'm144')}{' '}</label>
              <textarea
                rows={4}
                value={scenario.sytuatsiia}
                onChange={e => setScenario({ ...scenario, sytuatsiia: e.target.value })}
                className="w-full bg-navy-950 border border-navy-700 rounded-lg p-2.5 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1">{ui(lang, 'm145')}{' '}</label>
              <textarea
                rows={3}
                value={scenario.zastosovnist}
                onChange={e => setScenario({ ...scenario, zastosovnist: e.target.value })}
                className="w-full bg-navy-950 border border-navy-700 rounded-lg p-2.5 text-white"
              />
            </div>
          </div>
        )}
        {activeTab === 'roles' && (
          <div className="space-y-4 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-slate-400">
                {ui(lang, 'm146')}{' '}</span>
              <button
                onClick={() => {
                  const newR: Role = {
                    id: `R${scenario.diiovi_osoby.length + 1}`,
                    rol: ui(lang, 'm147'),
                    opys: ui(lang, 'm148'),
                    hravets: false
                  };
                  setScenario({ ...scenario, diiovi_osoby: [...scenario.diiovi_osoby, newR] });
                }}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                {ui(lang, 'm149')}{' '}</button>
            </div>

            <div className="space-y-3">
              {scenario.diiovi_osoby.map((role, rIdx) => (
                <div key={role.id} className="p-4 rounded-xl bg-navy-950 border border-navy-800 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 gap-3">
                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        value={role.id}
                        onChange={e => {
                          const updated = [...scenario.diiovi_osoby];
                          updated[rIdx].id = e.target.value;
                          setScenario({ ...scenario, diiovi_osoby: updated });
                        }}
                        className="w-16 font-mono font-bold bg-navy-900 border border-navy-700 rounded p-1.5 text-center text-emerald-400"
                      />
                      <input
                        type="text"
                        value={role.rol}
                        placeholder={ui(lang, 'm150')}
                        onChange={e => {
                          const updated = [...scenario.diiovi_osoby];
                          updated[rIdx].rol = e.target.value;
                          setScenario({ ...scenario, diiovi_osoby: updated });
                        }}
                        className="w-64 bg-navy-900 border border-navy-700 rounded p-1.5 text-white font-semibold"
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      <label className="flex flex-wrap items-center gap-2 cursor-pointer text-slate-300">
                        <input
                          type="checkbox"
                          checked={!!role.hravets}
                          onChange={e => {
                            // Ensure only one player
                            const updated = scenario.diiovi_osoby.map((r, i) => ({
                              ...r,
                              hravets: i === rIdx ? e.target.checked : false
                            }));
                            setScenario({ ...scenario, diiovi_osoby: updated });
                          }}
                          className="rounded text-emerald-500 focus:ring-0"
                        />
                        <span>{ui(lang, 'm151')}{' '}</span>
                      </label>

                      <button
                        onClick={() => {
                          setScenario({
                            ...scenario,
                            diiovi_osoby: scenario.diiovi_osoby.filter((_, i) => i !== rIdx)
                          });
                        }}
                        className="p-1 rounded text-slate-500 hover:text-rose-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <textarea
                    rows={2}
                    value={role.opys}
                    placeholder={ui(lang, 'm152')}
                    onChange={e => {
                      const updated = [...scenario.diiovi_osoby];
                      updated[rIdx].opys = e.target.value;
                      setScenario({ ...scenario, diiovi_osoby: updated });
                    }}
                    className="w-full bg-navy-900 border border-navy-700 rounded p-2 text-slate-200"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
        {activeTab === 'nodes' && (
          <div className="space-y-6 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-navy-800">
              <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-1">
                {scenario.vuzly.map((node, nIdx) => (
                  <button
                    key={node.id}
                    onClick={() => setSelectedNodeIdx(nIdx)}
                    className={`px-3 py-1.5 rounded-lg font-mono font-bold transition-colors ${
                      selectedNodeIdx === nIdx
                        ? 'bg-emerald-600 text-white'
                        : 'bg-navy-950 text-slate-400 hover:text-white border border-navy-800'
                    }`}
                  >
                    {node.id}
                  </button>
                ))}
              </div>

              <button
                onClick={addNode}
                className="px-3 py-1.5 rounded-lg bg-navy-800 hover:bg-navy-700 text-emerald-300 font-semibold flex items-center gap-1.5 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                {ui(lang, 'm153')}{' '}</button>
            </div>
            {scenario.vuzly[selectedNodeIdx] && (
              <div className="p-5 rounded-xl bg-navy-950 border border-navy-800 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-emerald-400">
                      {ui(lang, 'm154')}{' '}</span>
                    <input
                      type="text"
                      value={scenario.vuzly[selectedNodeIdx].id}
                      onChange={e => {
                        const updated = [...scenario.vuzly];
                        updated[selectedNodeIdx].id = e.target.value;
                        setScenario({ ...scenario, vuzly: updated });
                      }}
                      className="w-20 font-mono font-bold bg-navy-900 border border-navy-700 rounded p-1.5 text-center text-white"
                    />
                  </div>

                  <button
                    onClick={() => removeNode(selectedNodeIdx)}
                    className="p-1 rounded text-slate-500 hover:text-rose-400 flex items-center gap-1"
                  >
                    <Trash2 className="w-4 h-4" />
                    {ui(lang, 'm155')}{' '}</button>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    {ui(lang, 'm156')}{' '}</label>
                  <textarea
                    rows={2}
                    value={scenario.vuzly[selectedNodeIdx].tekst}
                    onChange={e => {
                      const updated = [...scenario.vuzly];
                      updated[selectedNodeIdx].tekst = e.target.value;
                      setScenario({ ...scenario, vuzly: updated });
                    }}
                    className="w-full bg-navy-900 border border-navy-700 rounded p-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    {ui(lang, 'm157')}{' '}</label>
                  <input
                    type="text"
                    value={scenario.vuzly[selectedNodeIdx].zapytannia}
                    onChange={e => {
                      const updated = [...scenario.vuzly];
                      updated[selectedNodeIdx].zapytannia = e.target.value;
                      setScenario({ ...scenario, vuzly: updated });
                    }}
                    className="w-full bg-navy-900 border border-navy-700 rounded p-2 text-white font-semibold text-sm"
                  />
                </div>
                <div className="space-y-4 pt-3 border-t border-navy-800">
                  <span className="font-bold text-slate-300 uppercase tracking-wider block">
                    {ui(lang, 'm158')}{' '}</span>

                  {scenario.vuzly[selectedNodeIdx].varianty.map((v, vIdx) => (
                    <div key={v.id} className="p-4 rounded-xl bg-navy-900 border border-navy-750 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            type="text"
                            value={v.id}
                            placeholder="ID (A, B...)"
                            onChange={e => {
                              const updated = [...scenario.vuzly];
                              updated[selectedNodeIdx].varianty[vIdx].id = e.target.value;
                              setScenario({ ...scenario, vuzly: updated });
                            }}
                            className="w-16 font-mono font-bold bg-navy-950 border border-navy-700 rounded p-1.5 text-center text-emerald-400"
                          />
                          <span className="text-slate-400">{ui(lang, 'm159')}{' '}</span>
                          <input
                            type="text"
                            value={v.nastupnyi_vuzol || ''}
                            placeholder={ui(lang, 'm160')}
                            onChange={e => {
                              const updated = [...scenario.vuzly];
                              updated[selectedNodeIdx].varianty[vIdx].nastupnyi_vuzol = e.target.value.trim() || null;
                              setScenario({ ...scenario, vuzly: updated });
                            }}
                            className="w-24 font-mono bg-navy-950 border border-navy-700 rounded p-1.5 text-center text-amber-400"
                          />
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <label className="text-slate-400">{ui(lang, 'm161')}{' '}</label>
                          <input
                            type="number"
                            min={-2}
                            max={2}
                            value={v.baly.dobrochesnist}
                            onChange={e => {
                              const updated = [...scenario.vuzly];
                              updated[selectedNodeIdx].varianty[vIdx].baly.dobrochesnist = parseInt(e.target.value) || 0;
                              setScenario({ ...scenario, vuzly: updated });
                            }}
                            className="w-12 bg-navy-950 border border-navy-700 rounded p-1 text-center font-bold text-emerald-400"
                          />
                          <label className="text-slate-400">{ui(lang, 'm162')}{' '}</label>
                          <input
                            type="number"
                            min={-2}
                            max={2}
                            value={v.baly.efektyvnist}
                            onChange={e => {
                              const updated = [...scenario.vuzly];
                              updated[selectedNodeIdx].varianty[vIdx].baly.efektyvnist = parseInt(e.target.value) || 0;
                              setScenario({ ...scenario, vuzly: updated });
                            }}
                            className="w-12 bg-navy-950 border border-navy-700 rounded p-1 text-center font-bold text-amber-400"
                          />
                          <label className="text-slate-400">{ui(lang, 'm163')}{' '}</label>
                          <input
                            type="number"
                            min={-2}
                            max={2}
                            value={v.baly.dovira}
                            onChange={e => {
                              const updated = [...scenario.vuzly];
                              updated[selectedNodeIdx].varianty[vIdx].baly.dovira = parseInt(e.target.value) || 0;
                              setScenario({ ...scenario, vuzly: updated });
                            }}
                            className="w-12 bg-navy-950 border border-navy-700 rounded p-1 text-center font-bold text-cyan-400"
                          />
                        </div>
                      </div>

                      <textarea
                        rows={2}
                        value={v.tekst}
                        placeholder={ui(lang, 'm164')}
                        onChange={e => {
                          const updated = [...scenario.vuzly];
                          updated[selectedNodeIdx].varianty[vIdx].tekst = e.target.value;
                          setScenario({ ...scenario, vuzly: updated });
                        }}
                        className="w-full bg-navy-950 border border-navy-700 rounded p-2 text-white"
                      />

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={v.naslidky.odrazu}
                          placeholder={ui(lang, 'm165')}
                          onChange={e => {
                            const updated = [...scenario.vuzly];
                            updated[selectedNodeIdx].varianty[vIdx].naslidky.odrazu = e.target.value;
                            setScenario({ ...scenario, vuzly: updated });
                          }}
                          className="bg-navy-950 border border-navy-700 rounded p-1.5 text-slate-200"
                        />
                        <input
                          type="text"
                          value={v.naslidky.vidkladeni}
                          placeholder={ui(lang, 'm166')}
                          onChange={e => {
                            const updated = [...scenario.vuzly];
                            updated[selectedNodeIdx].varianty[vIdx].naslidky.vidkladeni = e.target.value;
                            setScenario({ ...scenario, vuzly: updated });
                          }}
                          className="bg-navy-950 border border-navy-700 rounded p-1.5 text-slate-200"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        {activeTab === 'verification' && (
          <div className="space-y-4 text-xs">
            <h3 className="font-bold text-white uppercase tracking-wider">
              {ui(lang, 'm167')}{' '}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-bold mb-1">{ui(lang, 'm168')}{' '}</label>
                <select
                  value={scenario.perevirka_zmistu.fakhivets_dzpk}
                  onChange={e => setScenario({
                    ...scenario,
                    perevirka_zmistu: { ...scenario.perevirka_zmistu, fakhivets_dzpk: e.target.value as any }
                  })}
                  className="w-full bg-navy-950 border border-navy-700 rounded p-2 text-white"
                >
                  <option value="не проведено">{ui(lang, 'm169')}{' '}</option>
                  <option value="проведено">{ui(lang, 'm170')}{' '}</option>
                  <option value="проведено із зауваженнями">{ui(lang, 'm171')}{' '}</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">{ui(lang, 'm172')}{' '}</label>
                <input
                  type="text"
                  value={scenario.perevirka_zmistu.khto || ''}
                  onChange={e => setScenario({
                    ...scenario,
                    perevirka_zmistu: { ...scenario.perevirka_zmistu, khto: e.target.value || null }
                  })}
                  placeholder={ui(lang, 'm173')}
                  className="w-full bg-navy-950 border border-navy-700 rounded p-2 text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1">{ui(lang, 'm174')}{' '}</label>
              <textarea
                rows={2}
                value={scenario.perevirka_zmistu.prymitka}
                onChange={e => setScenario({
                  ...scenario,
                  perevirka_zmistu: { ...scenario.perevirka_zmistu, prymitka: e.target.value }
                })}
                className="w-full bg-navy-950 border border-navy-700 rounded p-2 text-white"
              />
            </div>

            <h3 className="font-bold text-white uppercase tracking-wider pt-4 border-t border-navy-800">
              {ui(lang, 'm175')}{' '}</h3>
            <div>
              <label className="block text-slate-300 font-bold mb-1">{ui(lang, 'm176')}{' '}</label>
              <input
                type="text"
                value={scenario.shi.instrument || ''}
                onChange={e => setScenario({
                  ...scenario,
                  shi: { ...scenario.shi, instrument: e.target.value || null }
                })}
                placeholder="Claude (Anthropic) / Antigravity"
                className="w-full bg-navy-950 border border-navy-700 rounded p-2 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1">{ui(lang, 'm177')}{' '}</label>
              <textarea
                rows={2}
                value={scenario.shi.shcho_zrobleno}
                onChange={e => setScenario({
                  ...scenario,
                  shi: { ...scenario.shi, shcho_zrobleno: e.target.value }
                })}
                className="w-full bg-navy-950 border border-navy-700 rounded p-2 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1">{ui(lang, 'm178')}{' '}</label>
              <textarea
                rows={2}
                value={scenario.shi.perevirka_liudynoiu}
                onChange={e => setScenario({
                  ...scenario,
                  shi: { ...scenario.shi, perevirka_liudynoiu: e.target.value }
                })}
                className="w-full bg-navy-950 border border-navy-700 rounded p-2 text-white"
              />
            </div>
          </div>
        )}
        {activeTab === 'graph' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
              <span>{ui(lang, 'm179')}{' '}</span>
              <span className="font-mono">{scenario.vuzly.length} {ui(lang, 'm180')}{' '}</span>
            </div>
            <DecisionTreeSvg scenario={scenario} />
          </div>
        )}
      </div>
    </div>
  );
};
