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
import { Language } from './i18n';

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'catalog' | 'solo' | 'classroom' | 'student' | 'builder' | 'norms'>('catalog');
  const [activeScenario, setActiveScenario] = useState<Scenario | null>(teamScenarios[0] || null);
  const [studentRoomCode, setStudentRoomCode] = useState<string>('');
  const [lang, setLang] = useState<Language>('uk');

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
    <div className="min-h-screen flex flex-col bg-navy-950 text-slate-100 selection:bg-emerald-600 selection:text-white">
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
            scenario={activeScenario}
            onBackToCatalog={() => setCurrentView('catalog')}
            lang={lang}
          />
        )}

        {currentView === 'classroom' && activeScenario && (
          <ClassroomFacilitator
            scenario={activeScenario}
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
    </div>
  );
};
