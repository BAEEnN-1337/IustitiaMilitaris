import React, { useEffect, useState } from 'react';
import { Shield, Sun, Moon, UserRound, Wifi, WifiOff } from 'lucide-react';
import { Language, translations } from '../i18n';
import labels from '../i18n/design.json';
interface NavbarProps {
  onAuth?: () => void;
  currentView: 'catalog' | 'solo' | 'classroom' | 'builder' | 'norms';
  setCurrentView: (
    view: 'catalog' | 'solo' | 'classroom' | 'builder' | 'norms'
  ) => void;
  lang: Language;
  setLang: (lang: Language) => void;
}
export const Navbar = ({
  currentView,
  setCurrentView,
  lang,
  setLang,
  onAuth
}: NavbarProps) => {
  const t = labels[lang];
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('eds-theme') === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem('eds-theme', theme);
    } catch {}
  }, [theme]);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  const views = ['catalog', 'classroom', 'builder', 'norms'] as const;
  return (
    <header className="site-header sticky top-0 z-40 border-b border-navy-700 bg-navy-900/95 backdrop-blur">
      <div className="header-row">
        <button
          className="header-brand"
          onClick={() => setCurrentView('catalog')}
        >
          <Shield className="h-7 w-7 shrink-0 text-emerald-400" />
          <span>{translations[lang].appTitle}</span>
        </button>
        <nav className="header-nav" aria-label={translations[lang].appTitle}>
          {views.map((view) => (
            <button
              key={view}
              aria-current={
                currentView === view ||
                (currentView === 'solo' && view === 'catalog')
                  ? 'page'
                  : undefined
              }
              className={`header-tab ${currentView === view ? 'bg-navy-800 text-emerald-300' : 'text-slate-300'}`}
              onClick={() => setCurrentView(view)}
            >
              {t[view]}
            </button>
          ))}
        </nav>
        <div className="header-tools">
          <span
            className={`flex items-center gap-1 text-xs ${online ? 'text-emerald-400' : 'text-amber-400'}`}
            role="status"
            aria-label={online ? t.online : t.offline}
            title={online ? t.online : t.offline}
          >
            {online ? <Wifi size={14} /> : <WifiOff size={14} />}
            <span className="hidden 2xl:inline">
              {online ? t.online : t.offline}
            </span>
          </span>
          <button
            className="header-icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label={theme === 'dark' ? t.light : t.dark}
            title={theme === 'dark' ? t.light : t.dark}
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <div className="flex rounded-lg border border-navy-700 p-0.5">
            {(['uk', 'en'] as const).map((l) => (
              <button
                key={l}
                className={`rounded px-2 py-1 text-xs font-semibold ${lang === l ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}
                aria-pressed={lang === l}
                onClick={() => setLang(l)}
              >
                {l === 'uk' ? 'УКР' : 'ENG'}
              </button>
            ))}
          </div>
          <button
            className="header-icon"
            onClick={onAuth}
            aria-label={t.account}
            title={t.account}
          >
            <UserRound size={18} />
          </button>
        </div>
      </div>
    </header>
  );
};
