import designLabels from '../i18n/design.json';
import { ui } from '../i18n/ui';
import React from 'react';
import { ShieldCheck, Zap, HeartHandshake, Info } from 'lucide-react';
import { Scores } from '../types';
import { Language, translations } from '../i18n';

interface BalanceIndicatorsProps {
  scores: Scores;
  explanation?: string;
  lang: Language;
  showExplanation?: boolean;
}

export const BalanceIndicators: React.FC<BalanceIndicatorsProps> = ({
  scores,
  explanation,
  lang,
  showExplanation = true
}) => {
  const t = translations[lang];

  const formatDelta = (val: number) => {
    if (val > 0) return `+${val}`;
    return `${val}`;
  };

  const getScoreColor = (val: number) => {
    if (val > 0)
      return 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30';
    if (val === 0) return 'text-slate-300 bg-navy-800 border-navy-700';
    return 'text-rose-400 bg-rose-500/15 border-rose-500/30';
  };

  const getBarWidth = (val: number) => {
    // scale -2..+2 to 0%..100% with 50% as baseline 0
    // -2 => 10%, -1 => 30%, 0 => 50%, +1 => 70%, +2 => 90%
    return `${Math.round(((Math.max(-2, Math.min(2, val)) + 2) / 4) * 80 + 10)}%`;
  };

  const getBarColor = (val: number) => {
    if (val > 0) return 'bg-emerald-500';
    if (val === 0) return 'bg-slate-500';
    return 'bg-rose-500';
  };

  return (
    <div className="space-y-3 p-4 rounded-xl bg-navy-900 border border-navy-700">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 pb-2 border-b border-navy-800">
        <span className="font-semibold uppercase tracking-wider text-slate-300">
          {t.feedback.balanceTitle}
        </span>
        <span className="text-[11px] text-amber-400/90 flex items-center gap-1">
          <Info className="w-3.5 h-3.5" />
          {ui(lang, 'm0')}{' '}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3 rounded-lg bg-navy-850 border border-navy-750 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              {t.dimensions.dobrochesnist}
            </span>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded border ${getScoreColor(scores.dobrochesnist)}`}
            >
              {formatDelta(scores.dobrochesnist)}
            </span>
          </div>
          <div className="w-full bg-navy-950 h-2 rounded-full overflow-hidden border border-navy-700/50">
            <div
              className={`h-full rounded-full transition-all duration-200 ${getBarColor(scores.dobrochesnist)}`}
              style={{ width: getBarWidth(scores.dobrochesnist) }}
            />
          </div>
          <p className="text-xs text-slate-400">
            {
              designLabels[lang][
                scores.dobrochesnist > 0
                  ? 'positive'
                  : scores.dobrochesnist < 0
                    ? 'negative'
                    : 'neutral'
              ]
            }
          </p>
        </div>
        <div className="p-3 rounded-lg bg-navy-850 border border-navy-750 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-400" />
              {t.dimensions.efektyvnist}
            </span>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded border ${getScoreColor(scores.efektyvnist)}`}
            >
              {formatDelta(scores.efektyvnist)}
            </span>
          </div>
          <div className="w-full bg-navy-950 h-2 rounded-full overflow-hidden border border-navy-700/50">
            <div
              className={`h-full rounded-full transition-all duration-200 ${getBarColor(scores.efektyvnist)}`}
              style={{ width: getBarWidth(scores.efektyvnist) }}
            />
          </div>
          <p className="text-xs text-slate-400">
            {
              designLabels[lang][
                scores.efektyvnist > 0
                  ? 'positive'
                  : scores.efektyvnist < 0
                    ? 'negative'
                    : 'neutral'
              ]
            }
          </p>
        </div>
        <div className="p-3 rounded-lg bg-navy-850 border border-navy-750 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <HeartHandshake className="w-4 h-4 text-cyan-400" />
              {t.dimensions.dovira}
            </span>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded border ${getScoreColor(scores.dovira)}`}
            >
              {formatDelta(scores.dovira)}
            </span>
          </div>
          <div className="w-full bg-navy-950 h-2 rounded-full overflow-hidden border border-navy-700/50">
            <div
              className={`h-full rounded-full transition-all duration-200 ${getBarColor(scores.dovira)}`}
              style={{ width: getBarWidth(scores.dovira) }}
            />
          </div>
          <p className="text-xs text-slate-400">
            {
              designLabels[lang][
                scores.dovira > 0
                  ? 'positive'
                  : scores.dovira < 0
                    ? 'negative'
                    : 'neutral'
              ]
            }
          </p>
        </div>
      </div>

      {showExplanation && explanation && (
        <div className="mt-2 text-xs text-slate-300 bg-navy-950/70 p-2.5 rounded-lg border border-navy-800 leading-relaxed">
          <strong className="text-slate-400">{ui(lang, 'm1')} </strong>
          {explanation}
        </div>
      )}
    </div>
  );
};
