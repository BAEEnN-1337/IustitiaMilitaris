import { localizeScenario } from './i18n/content';
import React, { useState, useEffect } from 'react';
import { Scenario } from './types';
import { teamScenarios } from './data/scenarios';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ScenarioCatalog } from './components/ScenarioCatalog';
import { SoloSimulator } from './components/SoloSimulator';
import { ClassroomFacilitator } from './components/ClassroomFacilitator';
import { ClassroomStudent } from './components/ClassroomStudent';
import { ScenarioBuilder } from './components/ScenarioBuilder';
import { NormsLibrary } from './components/NormsLibrary';
import { Language, translations } from './i18n';
import { LanguageContext } from './i18n/ui';

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'catalog' | 'solo' | 'classroom' | 'student' | 'builder' | 'norms'>('catalog');
  const [activeScenario, setActiveScenario] = useState<Scenario | null>(teamScenarios[0] || null);
  const [studentRoomCode, setStudentRoomCode] = useState<string>('');
  const [lang, setLang] = useState<Language>(() => { try { return localStorage.getItem('eds-language') === 'en' ? 'en' : 'uk'; } catch { return 'uk'; } });

  useEffect(() => {
    // Check if URL has ?room=123456 for direct student phone join
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setStudentRoomCode(roomParam);
      setCurrentView('student');
    }

    // Register service worker for offline PWA
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = translations[lang].appTitle;
    document.querySelector('meta[name=description]')?.setAttribute('content', translations[lang].appSubtitle);
    try { localStorage.setItem('eds-language', lang); } catch {}
  }, [lang]);

  const handleStartSolo = (scenario: Scenario) => {
    setActiveScenario(scenario);
    setCurrentView('solo');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartClassroom = (scenario: Scenario) => {
    setActiveScenario(scenario);
    setCurrentView('classroom');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTestBuilderScenario = (scenario: Scenario) => {
    setActiveScenario(scenario);
    setCurrentView('solo');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <LanguageContext.Provider value={lang}><div className="min-h-screen flex flex-col bg-navy-950 text-slate-100 selection:bg-emerald-600 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        currentView={currentView === 'student' ? 'classroom' : currentView}
        setCurrentView={(view) => {
          setCurrentView(view);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        lang={lang}
        setLang={setLang}
      />

      {/* Main View Container */}
      <main className="flex-1">
        {currentView === 'catalog' && (
          <ScenarioCatalog
            onStartSolo={handleStartSolo}
            onStartClassroom={handleStartClassroom}
            lang={lang}
          />
        )}

        {currentView === 'solo' && activeScenario && (
          <SoloSimulator
            scenario={localizeScenario(activeScenario, lang)}
            onBackToCatalog={() => setCurrentView('catalog')}
            lang={lang}
          />
        )}

        {currentView === 'classroom' && activeScenario && (
          <ClassroomFacilitator
            scenario={localizeScenario(activeScenario, lang)}
            onExit={() => setCurrentView('catalog')}
            lang={lang}
          />
        )}

        {currentView === 'student' && (
          <ClassroomStudent
            initialCode={studentRoomCode}
            onExit={() => setCurrentView('catalog')}
            lang={lang}
          />
        )}

        {currentView === 'builder' && (
          <ScenarioBuilder
            onTestScenario={handleTestBuilderScenario}
            lang={lang}
          />
        )}

        {currentView === 'norms' && (
          <NormsLibrary
            lang={lang}
          />
        )}
      </main>

      {/* Institutional Footer */}
      <Footer lang={lang} />
    </div></LanguageContext.Provider>
  );
};
