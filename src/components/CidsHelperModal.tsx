import React, { useState } from 'react';
import { X, BookOpen, CheckSquare, Square, Scale, HelpCircle } from 'lucide-react';
import { Language, translations } from '../i18n';

interface CidsHelperModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
}

export const CidsHelperModal: React.FC<CidsHelperModalProps> = ({ isOpen, onClose, lang }) => {
  const t = translations[lang];

  // Interactive local checklist state (used solely for reflection, not persisted or graded)
  const [checkedTests, setCheckedTests] = useState<Record<string, boolean>>({});

  if (!isOpen) return null;

  const toggleTest = (id: string) => {
    setCheckedTests(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const resetChecklist = () => {
    setCheckedTests({});
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div 
        className="relative w-full max-w-3xl bg-navy-900 border border-navy-700 rounded-xl shadow-2xl p-6 sm:p-8 my-8 text-slate-100 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-navy-700">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                {t.cids.modalTitle}
              </h2>
              <p className="text-xs text-slate-400">
                {t.cids.modalSubtitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-navy-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Part 1: Kidder's 4 Dilemma Types */}
        <div className="mt-6 space-y-3">
          <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            {t.cids.kidderTitle}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-lg bg-navy-850 border border-navy-700 hover:border-amber-500/30 transition-colors">
              <div className="font-semibold text-sm text-slate-200">{t.cids.kidder1}</div>
              <div className="text-xs text-slate-400 mt-1 leading-relaxed">{t.cids.kidder1Desc}</div>
            </div>
            <div className="p-3.5 rounded-lg bg-navy-850 border border-navy-700 hover:border-amber-500/30 transition-colors">
              <div className="font-semibold text-sm text-slate-200">{t.cids.kidder2}</div>
              <div className="text-xs text-slate-400 mt-1 leading-relaxed">{t.cids.kidder2Desc}</div>
            </div>
            <div className="p-3.5 rounded-lg bg-navy-850 border border-navy-700 hover:border-amber-500/30 transition-colors">
              <div className="font-semibold text-sm text-slate-200">{t.cids.kidder3}</div>
              <div className="text-xs text-slate-400 mt-1 leading-relaxed">{t.cids.kidder3Desc}</div>
            </div>
            <div className="p-3.5 rounded-lg bg-navy-850 border border-navy-700 hover:border-amber-500/30 transition-colors">
              <div className="font-semibold text-sm text-slate-200">{t.cids.kidder4}</div>
              <div className="text-xs text-slate-400 mt-1 leading-relaxed">{t.cids.kidder4Desc}</div>
            </div>
          </div>
        </div>

        {/* Part 2: CIDS 5-Tests Checklist */}
        <div className="mt-8 pt-6 border-t border-navy-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
              <HelpCircle className="w-4 h-4" />
              {t.cids.checklistTitle}
            </h3>
            {Object.values(checkedTests).some(Boolean) && (
              <button 
                onClick={resetChecklist} 
                className="text-xs text-slate-400 hover:text-amber-400 underline"
              >
                Очистити відмітки
              </button>
            )}
          </div>
          <p className="text-xs text-slate-400">
            {t.cids.checklistDesc}
          </p>

          <div className="space-y-2 mt-2">
            {[
              { id: 'test1', label: t.cids.test1 },
              { id: 'test2', label: t.cids.test2 },
              { id: 'test3', label: t.cids.test3 },
              { id: 'test4', label: t.cids.test4 },
              { id: 'test5', label: t.cids.test5 },
            ].map(test => {
              const checked = !!checkedTests[test.id];
              return (
                <div
                  key={test.id}
                  onClick={() => toggleTest(test.id)}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    checked
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-200'
                      : 'bg-navy-850 border-navy-700 text-slate-300 hover:bg-navy-800'
                  }`}
                >
                  <button className="mt-0.5 shrink-0 text-emerald-400">
                    {checked ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5 text-slate-500" />}
                  </button>
                  <span className="text-xs sm:text-sm leading-relaxed">{test.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer info & Close button */}
        <div className="mt-8 pt-4 border-t border-navy-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Стан чек-листа не оцінюється й слугує виключно для вашого самоконтролю.
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-colors shadow-lg"
          >
            {t.cids.closeBtn}
          </button>
        </div>
      </div>
    </div>
  );
};
