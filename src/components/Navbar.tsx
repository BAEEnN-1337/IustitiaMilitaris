import React from 'react';
import { Shield, BookOpen, Users, Compass, Wrench, Globe, Wifi } from 'lucide-react';
import { Language, translations } from '../i18n';

interface NavbarProps {
  currentView: 'catalog' | 'solo' | 'classroom' | 'builder' | 'norms';
  setCurrentView: (view: 'catalog' | 'solo' | 'classroom' | 'builder' | 'norms') => void;
  lang: Language;
  setLang: (lang: Language) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, setCurrentView, lang, setLang }) => {
  const t = translations[lang];

  return (
    <header className="sticky top-0 z-40 bg-navy-900/90 backdrop-blur border-b border-navy-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div 
            className="flex items-center space-x-3 cursor-pointer group"
            onClick={() => setCurrentView('catalog')}
          >
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="font-bold text-base sm:text-lg text-white tracking-tight flex items-center gap-2">
                {t.appTitle}
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-navy-800 text-emerald-400 border border-emerald-500/30">
                  IV Хакатон
                </span>
              </div>
              <div className="text-xs text-slate-400 hidden sm:block">
                {t.appSubtitle}
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
            <button
              onClick={() => setCurrentView('catalog')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                currentView === 'catalog'
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-navy-800'
              }`}
            >
              <Compass className="w-4 h-4" />
              {t.nav.catalog}
            </button>
            <button
              onClick={() => setCurrentView('classroom')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                currentView === 'classroom'
                  ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-navy-800'
              }`}
            >
              <Users className="w-4 h-4" />
              {t.nav.classroom}
            </button>
            <button
              onClick={() => setCurrentView('builder')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                currentView === 'builder'
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-navy-800'
              }`}
            >
              <Wrench className="w-4 h-4" />
              {t.nav.builder}
            </button>
            <button
              onClick={() => setCurrentView('norms')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                currentView === 'norms'
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-navy-800'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              {t.nav.norms}
            </button>
          </nav>

          {/* Right Toolbar: Offline Badge & Language Switcher */}
          <div className="flex items-center space-x-3">
            {/* 100% Offline Status Pill */}
            <div 
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-navy-800 border border-emerald-500/20 text-xs text-slate-300"
              title={t.nav.offlineDesc}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[11px] font-medium text-emerald-300">{t.nav.offlineReady}</span>
            </div>

            {/* Language Switcher */}
            <div className="flex items-center bg-navy-800 border border-navy-700 rounded-lg p-0.5 text-xs font-semibold">
              <button
                onClick={() => setLang('uk')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  lang === 'uk'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                УКР
              </button>
              <button
                onClick={() => setLang('en')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  lang === 'en'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                ENG
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Submenu Navigation */}
      <div className="md:hidden flex border-t border-navy-800 bg-navy-950 px-2 py-1 justify-around text-xs">
        <button
          onClick={() => setCurrentView('catalog')}
          className={`py-1.5 px-2 rounded font-medium flex flex-col items-center ${
            currentView === 'catalog' || currentView === 'solo' ? 'text-emerald-400' : 'text-slate-400'
          }`}
        >
          <Compass className="w-4 h-4 mb-0.5" />
          {t.nav.catalog}
        </button>
        <button
          onClick={() => setCurrentView('classroom')}
          className={`py-1.5 px-2 rounded font-medium flex flex-col items-center ${
            currentView === 'classroom' ? 'text-indigo-400' : 'text-slate-400'
          }`}
        >
          <Users className="w-4 h-4 mb-0.5" />
          {t.nav.classroom}
        </button>
        <button
          onClick={() => setCurrentView('builder')}
          className={`py-1.5 px-2 rounded font-medium flex flex-col items-center ${
            currentView === 'builder' ? 'text-amber-400' : 'text-slate-400'
          }`}
        >
          <Wrench className="w-4 h-4 mb-0.5" />
          {t.nav.builder}
        </button>
        <button
          onClick={() => setCurrentView('norms')}
          className={`py-1.5 px-2 rounded font-medium flex flex-col items-center ${
            currentView === 'norms' ? 'text-cyan-400' : 'text-slate-400'
          }`}
        >
          <BookOpen className="w-4 h-4 mb-0.5" />
          {t.nav.norms}
        </button>
      </div>
    </header>
  );
};
