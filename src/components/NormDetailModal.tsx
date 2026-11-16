import { localizeNorm } from '../i18n/content';
import { useLanguage } from '../i18n/ui';
import { ui } from '../i18n/ui';
import React from 'react';
import { X, BookOpen, ExternalLink, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';
import { NormEntry } from '../types';

interface NormDetailModalProps {
  norm: NormEntry | null;
  yakZastosovuietsia?: string;
  onClose: () => void;
}

export const NormDetailModal: React.FC<NormDetailModalProps> = ({ norm: originalNorm, yakZastosovuietsia, onClose }) => {
  const lang = useLanguage();
  const norm = originalNorm ? localizeNorm(originalNorm, lang) : null;
  if (!norm) return null;

  const isVerified = norm.status_zvirky === 'zvireno';
  const isRecommended = norm.status_zvirky === 'zvireno-rekomendatsiinyi';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div role="dialog" aria-modal="true" aria-label={ui(lang, 'closeDialog')}
        className="relative w-full max-w-2xl bg-navy-900 border border-navy-700 rounded-xl shadow-2xl p-6 sm:p-7 text-slate-100 max-h-[85dvh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-4 border-b border-navy-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                  {norm.id}
                </span>
                <span className="text-xs text-slate-400">{norm.punkt}</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white mt-1">
                {norm.akt}
              </h2>
            </div>
          </div>
          <button
            aria-label={ui(lang, 'closeDialog')}
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-navy-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Verification Status & Edition */}
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          <div className={`px-2.5 py-1 rounded-full border flex items-center gap-1.5 font-medium ${
            isVerified 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
              : isRecommended 
              ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
          }`}>
            {isVerified || isRecommended ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5" />
            )}
            <span>
              {isVerified ? ui(lang, 'm34') : isRecommended ? ui(lang, 'm35') : ui(lang, 'm36')}
            </span>
          </div>

          <div className="px-2.5 py-1 rounded-full bg-navy-800 border border-navy-700 text-slate-300">
            <strong>{ui(lang, 'm37')}{' '}</strong> {norm.redaktsiia}
          </div>
        </div>

        {/* How Applied in this Scenario */}
        {yakZastosovuietsia && (
          <div className="mt-4 p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25">
            <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
              <FileText className="w-3.5 h-3.5" />
              {ui(lang, 'm38')}{' '}</div>
            <p className="text-sm text-slate-200 leading-relaxed">
              {yakZastosovuietsia}
            </p>
          </div>
        )}

        {/* Short Summary */}
        <div className="mt-4">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
            {ui(lang, 'm39')}{' '}</div>
          <p className="text-sm text-slate-300 leading-relaxed">
            {norm.korotko}
          </p>
        </div>

        {/* Verbatim Quotes */}
        {norm.tsytaty && norm.tsytaty.length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">
              {ui(lang, 'm40')}{' '}</div>
            {norm.tsytaty.map((q, idx) => (
              <blockquote
                key={idx}
                className="p-3 rounded-lg bg-navy-950 border-l-4 border-amber-500 text-xs sm:text-sm text-amber-100/90 italic"
              >
                «{q}»
              </blockquote>
            ))}
          </div>
        )}

        {/* Source and Rada Link */}
        <div className="mt-6 pt-4 border-t border-navy-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-400">
          <div>
            {ui(lang, 'm41')}{' '}{norm.dzherelo_zvirky} ({norm.data_zvirky})
          </div>
          {norm.posylannia && (
            <a
              href={norm.posylannia}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-navy-800 hover:bg-navy-700 text-cyan-300 border border-cyan-800 transition-colors font-medium"
            >
              <span>zakon.rada.gov.ua</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
