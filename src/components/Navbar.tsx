import { BrandLogo } from './BrandLogo';
import brandLabels from '../i18n/brand.json';
import React, { useEffect, useState } from 'react';
import { Sun, Moon, UserRound } from 'lucide-react';
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
    <header className="site-header sticky top-0 z-40 border-b border-steel-700 bg-obsidian-900/95 backdrop-blur-md">
      <div className="header-row">
        <a
          href="/"
          className="header-brand brand-trigger"
          aria-label={brandLabels[lang].home}
          onClick={event => {
            if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            event.preventDefault();
            setCurrentView('catalog');
          }}
        >
          <BrandLogo />
          <span className="brand-wordmark">
            <span className="brand-name">IUSTITIA MILITARIS</span>
            <span className="brand-subtitle">{brandLabels[lang].short}</span>
          </span>
        </a>
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
              className={`header-tab ${currentView === view ? 'text-justice-gold border-justice-gold' : 'text-steel-300'}`}
              onClick={() => setCurrentView(view)}
            >
              {t[view]}
            </button>
          ))}
        </nav>
        <div className="header-tools">
          <span
            className={`flex items-center gap-1 text-xs ${online ? 'text-steel-300' : 'text-steel-400'}`}
            role="status"
            aria-label={online ? t.online : t.offline}
            title={online ? t.online : t.offline}
          >
            <span className="network-dot" aria-hidden="true" />
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
          <div className="flex rounded-sm border border-steel-700 p-0.5">
            {(['uk', 'en'] as const).map((l) => (
              <button
                key={l}
                className={`rounded-sm px-2 py-1 text-xs font-semibold ${lang === l ? 'bg-justice-gold/10 text-justice-gold' : 'text-steel-300'}`}
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
