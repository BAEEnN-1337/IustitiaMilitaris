import { AnimatedOverlay } from './Collapsible';
import { ui } from '../i18n/ui';
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



  const toggleTest = (id: string) => {
    setCheckedTests(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const resetChecklist = () => {
    setCheckedTests({});
  };

  return (
    <AnimatedOverlay onClose={onClose} isOpen={isOpen} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div role="dialog" aria-modal="true" aria-label={ui(lang, 'closeDialog')}
        className="steel-panel animate-fadeIn relative w-full max-w-3xl bg-obsidian-850 border border-steel-700 rounded-sm shadow-2xl p-6 sm:p-8 my-8 text-steel-100 max-h-[85dvh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 pb-4 border-b border-steel-700">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-sm bg-status-success/20 text-status-success border border-status-success/30">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <h2 className="im-title font-serif text-xl font-bold text-white flex flex-wrap items-center gap-2">
                {t.cids.modalTitle}
              </h2>
              <p className="text-xs text-steel-300">
                {t.cids.modalSubtitle}
              </p>
            </div>
          </div>
          <button
            aria-label={ui(lang, 'closeDialog')}
            onClick={onClose}
            className="im-secondary p-1.5 rounded-sm text-steel-300 hover:text-white hover:bg-obsidian-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="mt-6 space-y-3">
          <h3 className="im-section-title text-sm font-bold text-status-warning uppercase tracking-wider flex flex-wrap items-center gap-2">
            <BookOpen className="w-4 h-4" />
            {t.cids.kidderTitle}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="steel-panel p-3.5 rounded-sm bg-obsidian-850 border border-steel-700 hover:border-status-warning/30 transition-colors">
              <div className="font-semibold text-sm text-steel-100">{t.cids.kidder1}</div>
              <div className="text-xs text-steel-300 mt-1 leading-relaxed">{t.cids.kidder1Desc}</div>
            </div>
            <div className="steel-panel p-3.5 rounded-sm bg-obsidian-850 border border-steel-700 hover:border-status-warning/30 transition-colors">
              <div className="font-semibold text-sm text-steel-100">{t.cids.kidder2}</div>
              <div className="text-xs text-steel-300 mt-1 leading-relaxed">{t.cids.kidder2Desc}</div>
            </div>
            <div className="steel-panel p-3.5 rounded-sm bg-obsidian-850 border border-steel-700 hover:border-status-warning/30 transition-colors">
              <div className="font-semibold text-sm text-steel-100">{t.cids.kidder3}</div>
              <div className="text-xs text-steel-300 mt-1 leading-relaxed">{t.cids.kidder3Desc}</div>
            </div>
            <div className="steel-panel p-3.5 rounded-sm bg-obsidian-850 border border-steel-700 hover:border-status-warning/30 transition-colors">
              <div className="font-semibold text-sm text-steel-100">{t.cids.kidder4}</div>
              <div className="text-xs text-steel-300 mt-1 leading-relaxed">{t.cids.kidder4Desc}</div>
            </div>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-obsidian-800 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="im-section-title text-sm font-bold text-status-success uppercase tracking-wider flex flex-wrap items-center gap-2">
              <HelpCircle className="w-4 h-4" />
              {t.cids.checklistTitle}
            </h3>
            {Object.values(checkedTests).some(Boolean) && (
              <button 
                onClick={resetChecklist} 
                className="text-xs text-steel-300 hover:text-status-warning underline"
              >
                {ui(lang, 'm2')}{' '}</button>
            )}
          </div>
          <p className="text-xs text-steel-300">
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
                  className={`steel-panel flex items-start gap-3 p-3 rounded-sm border cursor-pointer transition-all ${
                    checked
                      ? 'bg-status-success/10 border-status-success/40 text-status-success'
                      : 'bg-obsidian-850 border-steel-700 text-steel-300 hover:bg-obsidian-800'
                  }`}
                >
                  <button className="mt-0.5 shrink-0 text-status-success">
                    {checked ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5 text-steel-400" />}
                  </button>
                  <span className="text-xs sm:text-sm leading-relaxed">{test.label}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="mt-8 pt-4 border-t border-obsidian-800 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] text-steel-300">
            {ui(lang, 'm3')}{' '}</span>
          <button
            aria-label={ui(lang, 'closeDialog')}
            onClick={onClose}
            className="im-primary px-5 py-2.5 rounded-sm bg-status-success hover:bg-status-success text-white font-semibold text-sm transition-colors shadow-lg"
          >
            {t.cids.closeBtn}
          </button>
        </div>
      </div>
    </AnimatedOverlay>
  );
};
