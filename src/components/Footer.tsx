import { ui } from '../i18n/ui';
import React from 'react';
import { ShieldAlert, Lock, CheckCircle2 } from 'lucide-react';
import { Language, translations } from '../i18n';

interface FooterProps {
  lang: Language;
}

export const Footer: React.FC<FooterProps> = ({ lang }) => {
  const t = translations[lang];

  return (
    <footer id="site-footer" className="mt-16 bg-obsidian-950 border-t border-obsidian-800 text-steel-300 py-8 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
        <div className="steel-panel flex items-start gap-3 p-3.5 rounded-sm bg-obsidian-850/80 border border-status-warning/20 text-steel-300">
          <ShieldAlert className="w-5 h-5 text-status-warning shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-status-warning">{ui(lang, 'm31')}{' '}</strong>
            {t.footer.disclaimer}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-steel-300">
          <div className="flex flex-wrap items-center gap-2">
            <Lock className="w-4 h-4 text-status-success" />
            <span>{t.footer.zeroPii}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-steel-300">
            <CheckCircle2 className="w-4 h-4 text-tactical-ice" />
            <span>{t.footer.copyright}</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
