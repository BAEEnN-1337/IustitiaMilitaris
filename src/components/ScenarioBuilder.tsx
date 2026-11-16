import React, { useState } from 'react';
import { 
  Wrench, CheckCircle2, AlertTriangle, Download, Upload, 
  Play, Plus, Trash2, Layers, BookOpen, User, Scale, ShieldCheck,
  FileCode, Sparkles
} from 'lucide-react';
import { Scenario, Node, Variant, Role, ValueConflict, ScenarioNorm } from '../types';
import { normyData } from '../data/scenarios';
import { validateScenario, ValidationError } from '../utils/validator';
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
    nazva: "Нова етична дилема",
    versiia: "1.0",
    data_stvorennia: "2026-11-16",
    tema: "konflikt-interesiv",
    audytoriia: ["офіцери підрозділів", "слухачі курсів"],
    tryvalist_khv: 20,
    kontekst: "Військова частина в районі виконання завдань. Офіцер постає перед складним етичним вибором.",
    diiovi_osoby: [
      { id: "R1", rol: "Командир роти", opys: "Офіцер, який ухвалює рішення. Його грає користувач.", hravets: true },
      { id: "R2", rol: "Підлеглий старшина", opys: "Військовослужбовець, причетний до ситуації.", hravets: false }
    ],
    sytuatsiia: "Опишіть ситуацію гострого морального вибору, де жоден з варіантів не є простим і кожен має власну ціну.",
    tsinnosti_v_konflikti: [
      { tsinnist_a: "законність", tsinnist_b: "лояльність підрозділу", poiasnennia: "Конфлікт між вимогами статуту і неформальними очікуваннями колег." }
    ],
    pochatkovyi_vuzol: "V1",
    vuzly: [
      {
        id: "V1",
        tekst: "",
        zapytannia: "Яке первинне рішення ви ухвалюєте?",
        varianty: [
          {
            id: "A",
            tekst: "Діяти строго за процедурою та зареєструвати офіційний рапорт.",
            naslidky: { odrazu: "Процедура розпочата законно.", vidkladeni: "Виникає напруга в колективі." },
            baly: { dobrochesnist: 2, efektyvnist: 0, dovira: 1 },
            chomu_taki_baly: "Дотримання вимог закону.",
            zvorotnyi_zviazok: "Законне рішення, хоч і вимагає стійкості.",
            normy: ["ZPK-28"],
            nastupnyi_vuzol: "V2"
          },
          {
            id: "B",
            tekst: "Врегулювати питання усно без оформлення документів.",
            naslidky: { odrazu: "Конфлікт приховано.", vidkladeni: "Проблема повторюється у більшому масштабі." },
            baly: { dobrochesnist: -1, efektyvnist: 1, dovira: -1 },
            chomu_taki_baly: "Кулуарне вирішення.",
            zvorotnyi_zviazok: "Компроміс створює ризик рецидиву.",
            normy: ["ZPK-42"],
            nastupnyi_vuzol: null
          },
          {
            id: "C",
            tekst: "Звернутися за порадою до уповноваженої особи з питань запобігання корупції.",
            naslidky: { odrazu: "Отримано фахову консультацію.", vidkladeni: "Рішення ухвалено з урахуванням юридичних ризиків." },
            baly: { dobrochesnist: 2, efektyvnist: 1, dovira: 2 },
            chomu_taki_baly: "Фахова консультація.",
            zvorotnyi_zviazok: "Використання інституційних каналів консультування.",
            normy: ["ZPK-28", "ZPK-44"],
            nastupnyi_vuzol: null
          }
        ]
      },
      {
        id: "V2",
        tekst: "Після реєстрації рапорту керівництво вимагає пояснень.",
        zapytannia: "Як ви обґрунтовуєте свою позицію?",
        varianty: [
          {
            id: "E1",
            tekst: "Надати повні нормативні посилання на статті закону та статуту.",
            naslidky: { odrazu: "Позиція зафіксована.", vidkladeni: "Питання передано на розгляд комісії." },
            baly: { dobrochesnist: 2, efektyvnist: 1, dovira: 1 },
            chomu_taki_baly: "Тверде дотримання закону.",
            zvorotnyi_zviazok: "Професійне правове обґрунтування.",
            normy: ["ZPK-28"],
            nastupnyi_vuzol: null
          },
          {
            id: "E2",
            tekst: "Спробувати відкликати рапорт під тиском зауважень.",
            naslidky: { odrazu: "Тиск слабшає.", vidkladeni: "Втрата репутації принципового офіцера." },
            baly: { dobrochesnist: -2, efektyvnist: 0, dovira: -2 },
            chomu_taki_baly: "Поступка перед тиском.",
            zvorotnyi_zviazok: "Невпевненість руйнує авторитет.",
            normy: ["ZPK-41"],
            nastupnyi_vuzol: null
          }
        ]
      }
    ],
    normy: [
      { id: "ZPK-28", yak_zastosovuietsia: "Запобігання та врегулювання конфлікту інтересів." },
      { id: "ZPK-41", yak_zastosovuietsia: "Заборона виконання незаконних наказів." },
      { id: "ZPK-42", yak_zastosovuietsia: "Вимоги щодо законності дій посадових осіб." },
      { id: "ZPK-44", yak_zastosovuietsia: "Звернення до уповноважених підрозділів." }
    ],
    zastosovnist: "Норми поширюються на військових посадових осіб підрозділу згідно з пп. «г» п. 1 ч. 1 ст. 3 Закону «Про запобігання корупції».",
    porady: [
      "Завжди фіксуйте процесуальні дії у письмовій формі.",
      "Звертайтеся за консультацією до антикорупційного уповноваженого у разі сумнівів."
    ],
    pytannia_dlia_obhovorennia: [
      "Як балансувати між військовою дисципліною та повідомленням про порушення?",
      "Які фактори найбільше впливають на страх офіцера перед відкритим конфліктом?"
    ],
    dzherelo_vypadku: { typ: "вигаданий", opys: "Розроблено в конструкторі сценаріїв для навчальних цілей." },
    perevirka_zmistu: { fakhivets_dzpk: "не проведено", khto: null, data: null, prymitka: "Чернетка створена в конструкторі. Потребує верифікації." },
    shi: { vykorystano: false, instrument: null, shcho_zrobleno: "Створено користувачем вручну.", perevirka_liudynoiu: "Авторський текст." }
  });

  const [selectedNodeIdx, setSelectedNodeIdx] = useState<number>(0);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  // Run validation
  const runValidation = () => {
    const errors = validateScenario(scenario, normyData);
    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleDownloadJson = () => {
    const isValid = runValidation();
    if (!isValid && !confirm('Сценарій містить помилки валідації. Завантажити все одно?')) {
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
        const errors = validateScenario(parsed, normyData);
        setValidationErrors(errors);
        alert(`Сценарій "${parsed.nazva || file.name}" успішно імпортовано!`);
      } catch (err) {
        alert('Помилка читання JSON-файлу: некоректний синтаксис.');
      }
    };
    reader.readAsText(file);
  };

  const handleTestInSimulator = () => {
    const isValid = runValidation();
    if (!isValid) {
      alert(`Сценарій має ${validationErrors.length} помилок валідації. Будь ласка, виправте їх перед тестуванням.`);
      return;
    }
    onTestScenario(scenario);
  };

  const handleExportScorm = async () => {
    const isValid = runValidation();
    if (!isValid) {
      alert('Будь ласка, виправте помилки валідації перед експортом у SCORM.');
      return;
    }
    try {
      const zipBlob = await generateScorm12Zip(scenario, normyData);
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
      alert('Помилка генерації SCORM');
    }
  };

  const addNode = () => {
    const nextIdx = scenario.vuzly.length + 1;
    const newId = `V${nextIdx}`;
    const newNode: Node = {
      id: newId,
      tekst: "Опис наступного етапу ситуації.",
      zapytannia: "Що ви робите на цьому кроці?",
      varianty: [
        {
          id: `X${nextIdx}1`,
          tekst: "Варіант вирішення 1",
          naslidky: { odrazu: "Прямий наслідок.", vidkladeni: "Відкладений наслідок." },
          baly: { dobrochesnist: 1, efektyvnist: 1, dovira: 1 },
          chomu_taki_baly: "Пояснення балів.",
          zvorotnyi_zviazok: "Зворотний звʼязок.",
          normy: [],
          nastupnyi_vuzol: null
        },
        {
          id: `X${nextIdx}2`,
          tekst: "Варіант вирішення 2",
          naslidky: { odrazu: "Прямий наслідок.", vidkladeni: "Відкладений наслідок." },
          baly: { dobrochesnist: -1, efektyvnist: 0, dovira: -1 },
          chomu_taki_baly: "Пояснення балів.",
          zvorotnyi_zviazok: "Зворотний звʼязок.",
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
      alert('Сценарій повинен містити хоча б один вузол.');
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
      {/* Top Header & Action Toolbar */}
      <div className="p-6 rounded-2xl bg-navy-900 border border-navy-700 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
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

        {/* Action Buttons */}
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

      {/* Validation Status Banner */}
      {validationErrors.length > 0 ? (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-1">
          <div className="font-bold flex items-center gap-2 text-rose-400">
            <AlertTriangle className="w-4 h-4" />
            Виявлено {validationErrors.length} невідповідностей вимогам schema.json / zibraty.py:
          </div>
          <ul className="list-disc pl-5 space-y-0.5">
            {validationErrors.map((err, idx) => (
              <li key={idx}><strong>{err.field}:</strong> {err.message}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Сценарій повністю валідний: відповідає schema.json, усі вузли досяжні, ID унікальні.</span>
        </div>
      )}

      {/* Tabs */}
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
              className={`px-4 py-2.5 rounded-t-lg transition-colors flex items-center gap-2 border-t border-x ${
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

      {/* TAB CONTENT */}
      <div className="p-6 sm:p-8 rounded-2xl bg-navy-900 border border-navy-700 shadow-xl space-y-6">
        {/* TAB 1: GENERAL */}
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
                <label className="block text-slate-300 font-bold mb-1">Версія:</label>
                <input
                  type="text"
                  value={scenario.versiia}
                  onChange={e => setScenario({ ...scenario, versiia: e.target.value })}
                  className="w-full bg-navy-950 border border-navy-700 rounded-lg p-2.5 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-bold mb-1">Дата створення (РРРР-ММ-ДД):</label>
                <input
                  type="text"
                  value={scenario.data_stvorennia}
                  onChange={e => setScenario({ ...scenario, data_stvorennia: e.target.value })}
                  className="w-full bg-navy-950 border border-navy-700 rounded-lg p-2.5 text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1">Назва сценарію:</label>
              <input
                type="text"
                value={scenario.nazva}
                onChange={e => setScenario({ ...scenario, nazva: e.target.value })}
                className="w-full bg-navy-950 border border-navy-700 rounded-lg p-2.5 text-white text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Тема (enum):</label>
                <select
                  value={scenario.tema}
                  onChange={e => setScenario({ ...scenario, tema: e.target.value })}
                  className="w-full bg-navy-950 border border-navy-700 rounded-lg p-2.5 text-white"
                >
                  <option value="podarunok">Подарунок (podarunok)</option>
                  <option value="konflikt-interesiv">Конфлікт інтересів (konflikt-interesiv)</option>
                  <option value="vykryvach">Захист викривача (vykryvach)</option>
                  <option value="akademichna-dobrochesnist">Академічна доброчесність (akademichna-dobrochesnist)</option>
                  <option value="sluzhbove-maino">Службове майно (sluzhbove-maino)</option>
                  <option value="kadrovi-rishennia">Кадрові рішення (kadrovi-rishennia)</option>
                  <option value="neformalnyi-tysk">Неформальний тиск (neformalnyi-tysk)</option>
                  <option value="rozpodil-resursiv">Розподіл ресурсів (rozpodil-resursiv)</option>
                  <option value="pravdyvist-zvitiv">Правдивість звітів (pravdyvist-zvitiv)</option>
                  <option value="inshe">Інше (inshe)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Орієнтовна тривалість (хвилин):</label>
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
              <label className="block text-slate-300 font-bold mb-1">Контекст (щонайменше 20 символів):</label>
              <textarea
                rows={3}
                value={scenario.kontekst}
                onChange={e => setScenario({ ...scenario, kontekst: e.target.value })}
                className="w-full bg-navy-950 border border-navy-700 rounded-lg p-2.5 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1">Опис ситуації (щонайменше 50 символів):</label>
              <textarea
                rows={4}
                value={scenario.sytuatsiia}
                onChange={e => setScenario({ ...scenario, sytuatsiia: e.target.value })}
                className="w-full bg-navy-950 border border-navy-700 rounded-lg p-2.5 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1">Застосовність норм (хто субʼєкт, хто ні):</label>
              <textarea
                rows={3}
                value={scenario.zastosovnist}
                onChange={e => setScenario({ ...scenario, zastosovnist: e.target.value })}
                className="w-full bg-navy-950 border border-navy-700 rounded-lg p-2.5 text-white"
              />
            </div>
          </div>
        )}

        {/* TAB 2: ROLES */}
        {activeTab === 'roles' && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">
                Дійові особи (щонайменше 2, рівно одна з позначкою "Гравець"):
              </span>
              <button
                onClick={() => {
                  const newR: Role = {
                    id: `R${scenario.diiovi_osoby.length + 1}`,
                    rol: "Нова роль",
                    opys: "Опис ролі",
                    hravets: false
                  };
                  setScenario({ ...scenario, diiovi_osoby: [...scenario.diiovi_osoby, newR] });
                }}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Додати роль
              </button>
            </div>

            <div className="space-y-3">
              {scenario.diiovi_osoby.map((role, rIdx) => (
                <div key={role.id} className="p-4 rounded-xl bg-navy-950 border border-navy-800 space-y-3">
                  <div className="flex items-center justify-between gap-3">
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
                        placeholder="Назва посади без імені"
                        onChange={e => {
                          const updated = [...scenario.diiovi_osoby];
                          updated[rIdx].rol = e.target.value;
                          setScenario({ ...scenario, diiovi_osoby: updated });
                        }}
                        className="w-64 bg-navy-900 border border-navy-700 rounded p-1.5 text-white font-semibold"
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 cursor-pointer text-slate-300">
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
                        <span>Роль користувача (hravets)</span>
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
                    placeholder="Опис посади та функцій"
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

        {/* TAB 3: NODES & VARIANTS */}
        {activeTab === 'nodes' && (
          <div className="space-y-6 text-xs">
            {/* Node Selector Pills */}
            <div className="flex items-center justify-between pb-3 border-b border-navy-800">
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
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
                Додати вузол
              </button>
            </div>

            {/* Selected Node Editor */}
            {scenario.vuzly[selectedNodeIdx] && (
              <div className="p-5 rounded-xl bg-navy-950 border border-navy-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-emerald-400">
                      Редагування вузла:
                    </span>
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
                    Видалити вузол
                  </button>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    Текст кроку (для V1 може бути порожнім):
                  </label>
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
                    Питання вибору (zapytannia):
                  </label>
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

                {/* Variants List */}
                <div className="space-y-4 pt-3 border-t border-navy-800">
                  <span className="font-bold text-slate-300 uppercase tracking-wider block">
                    Варіанти дій (2–4 варіанти):
                  </span>

                  {scenario.vuzly[selectedNodeIdx].varianty.map((v, vIdx) => (
                    <div key={v.id} className="p-4 rounded-xl bg-navy-900 border border-navy-750 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
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
                          <span className="text-slate-400">Наступний крок:</span>
                          <input
                            type="text"
                            value={v.nastupnyi_vuzol || ''}
                            placeholder="V2 (або порожньо)"
                            onChange={e => {
                              const updated = [...scenario.vuzly];
                              updated[selectedNodeIdx].varianty[vIdx].nastupnyi_vuzol = e.target.value.trim() || null;
                              setScenario({ ...scenario, vuzly: updated });
                            }}
                            className="w-24 font-mono bg-navy-950 border border-navy-700 rounded p-1.5 text-center text-amber-400"
                          />
                        </div>

                        {/* Scores -2..+2 */}
                        <div className="flex items-center gap-2 text-xs">
                          <label className="text-slate-400">Д:</label>
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
                          <label className="text-slate-400">Е:</label>
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
                          <label className="text-slate-400">Дв:</label>
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
                        placeholder="Текст варіанта"
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
                          placeholder="Наслідки: Одразу"
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
                          placeholder="Наслідки: Згодом"
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

        {/* TAB 4: VERIFICATION & AI PASSPORT */}
        {activeTab === 'verification' && (
          <div className="space-y-4 text-xs">
            <h3 className="font-bold text-white uppercase tracking-wider">
              Паспорт перевірки змісту (ДЗПК)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Статус перевірки:</label>
                <select
                  value={scenario.perevirka_zmistu.fakhivets_dzpk}
                  onChange={e => setScenario({
                    ...scenario,
                    perevirka_zmistu: { ...scenario.perevirka_zmistu, fakhivets_dzpk: e.target.value as any }
                  })}
                  className="w-full bg-navy-950 border border-navy-700 rounded p-2 text-white"
                >
                  <option value="не проведено">не проведено</option>
                  <option value="проведено">проведено</option>
                  <option value="проведено із зауваженнями">проведено із зауваженнями</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Хто перевірив (посада без імені):</label>
                <input
                  type="text"
                  value={scenario.perevirka_zmistu.khto || ''}
                  onChange={e => setScenario({
                    ...scenario,
                    perevirka_zmistu: { ...scenario.perevirka_zmistu, khto: e.target.value || null }
                  })}
                  placeholder="Фахівець ДЗПК"
                  className="w-full bg-navy-950 border border-navy-700 rounded p-2 text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1">Примітки перевірки змісту:</label>
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
              Політика використання ШІ
            </h3>
            <div>
              <label className="block text-slate-300 font-bold mb-1">Інструмент ШІ:</label>
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
              <label className="block text-slate-300 font-bold mb-1">Що зроблено за допомогою ШІ:</label>
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
              <label className="block text-slate-300 font-bold mb-1">Перевірка людиною:</label>
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

        {/* TAB 5: VISUAL GRAPH */}
        {activeTab === 'graph' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Жива візуалізація дерева рішень (недосяжні вузли підсвічуються пунктиром та червоним):</span>
              <span className="font-mono">{scenario.vuzly.length} вузлів</span>
            </div>
            <DecisionTreeSvg scenario={scenario} />
          </div>
        )}
      </div>
    </div>
  );
};
