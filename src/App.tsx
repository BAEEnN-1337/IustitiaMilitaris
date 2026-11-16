import { Auth } from './components/Auth';
import accountLabels from './i18n/accounts.json';
import { localizeScenario } from './i18n/content';
import React, { useState, useEffect } from 'react';
import { Scenario } from './types';
import { allScenarios, teamScenarios } from './data/scenarios';
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
  const [pathname, setPathname] = useState(window.location.pathname);
  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setPathname(path);
  };
  useEffect(() => {
    const back = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', back);
    return () => window.removeEventListener('popstate', back);
  }, []);
  const currentView =
    pathname === '/'
      ? 'catalog'
      : /^\/scenarios\/S\d{2}(\/play|\/summary)?$/.test(pathname)
        ? 'solo'
        : pathname.startsWith('/classroom/join/')
          ? 'student'
          : pathname.startsWith('/classroom/host/')
            ? 'classroom'
            : pathname === '/classroom'
              ? 'student'
              : /^\/builder(\/S\d{2})?$/.test(pathname)
                ? 'builder'
                : pathname === '/norms'
                  ? 'norms'
                  : pathname === '/auth'
                    ? 'auth'
                    : 'missing';
  const setCurrentView = (view: string) =>
    navigate(
      (
        {
          catalog: '/',
          solo: '/scenarios/S06',
          classroom: '/classroom',
          student: '/classroom',
          builder: '/builder',
          norms: '/norms',
          auth: '/auth'
        } as Record<string, string>
      )[view] || '/'
    );
  const [customScenario, setActiveScenario] = useState<Scenario | null>(() => {
    try {
      return (
        JSON.parse(sessionStorage.getItem('builder-preview') || 'null') ||
        teamScenarios[0]
      );
    } catch {
      return teamScenarios[0];
    }
  });
  const studentRoomCode = pathname.split('/')[3] || '';
  const scenarioId = pathname.split('/')[2];
  const activeScenario =
    allScenarios.find((s) => s.id === scenarioId) || customScenario;
  const [lang, setLang] = useState<Language>(() => {
    try {
      return localStorage.getItem('eds-language') === 'en' ? 'en' : 'uk';
    } catch {
      return 'uk';
    }
  });

  useEffect(() => {
    // Check if URL has ?room=123456 for direct student phone join
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      navigate('/classroom/join/' + encodeURIComponent(roomParam));
    }

    // Register service worker for offline PWA
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = translations[lang].appTitle;
    document
      .querySelector('meta[name=description]')
      ?.setAttribute('content', translations[lang].appSubtitle);
    try {
      localStorage.setItem('eds-language', lang);
    } catch {}
  }, [lang]);

  const handleStartSolo = (scenario: Scenario) => {
    setActiveScenario(scenario);
    navigate('/scenarios/' + scenario.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartClassroom = (scenario: Scenario) => {
    setActiveScenario(scenario);
    navigate('/classroom/host/new?scenario=' + scenario.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTestBuilderScenario = (scenario: Scenario) => {
    try {
      sessionStorage.setItem('builder-preview', JSON.stringify(scenario));
    } catch {}
    setActiveScenario(scenario);
    navigate('/scenarios/' + scenario.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <LanguageContext.Provider value={lang}>
      <div className="min-h-screen flex flex-col bg-navy-950 text-slate-100 selection:bg-emerald-600 selection:text-white">
        <Navbar
          onAuth={() => navigate('/auth')}
          currentView={
            currentView === 'student' || currentView === 'classroom'
              ? 'classroom'
              : currentView === 'auth' || currentView === 'missing'
                ? 'catalog'
                : currentView
          }
          setCurrentView={(view) => {
            setCurrentView(view);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          lang={lang}
          setLang={setLang}
        />
        <main className="flex-1">
          {currentView === 'auth' && (
            <Auth lang={lang} onExit={() => navigate('/')} />
          )}
          {(currentView === 'missing' ||
            (currentView === 'solo' && activeScenario?.id !== scenarioId)) && (
            <section className="p-8">
              <h1>{accountLabels[lang].notFound}</h1>
              <button onClick={() => navigate('/')}>
                {accountLabels[lang].home}
              </button>
            </section>
          )}
          {currentView === 'catalog' && (
            <ScenarioCatalog
              onStartSolo={handleStartSolo}
              onStartClassroom={handleStartClassroom}
              lang={lang}
            />
          )}

          {currentView === 'solo' &&
            activeScenario &&
            activeScenario.id === scenarioId && (
              <SoloSimulator
                key={pathname}
                scenario={localizeScenario(activeScenario, lang)}
                onBackToCatalog={() => setCurrentView('catalog')}
                lang={lang}
              />
            )}

          {currentView === 'classroom' && activeScenario && (
            <ClassroomFacilitator
              scenario={localizeScenario(
                currentView === 'classroom'
                  ? allScenarios.find(
                      (s) =>
                        s.id ===
                        new URLSearchParams(window.location.search).get(
                          'scenario'
                        )
                    ) || activeScenario
                  : activeScenario,
                lang
              )}
              onExit={() => setCurrentView('catalog')}
              lang={lang}
            />
          )}

          {currentView === 'student' && (
            <ClassroomStudent key={pathname}
              initialCode={studentRoomCode}
              onExit={() => setCurrentView('catalog')}
              lang={lang}
            />
          )}

          {currentView === 'builder' && (
            <ScenarioBuilder
              key={pathname}
              onTestScenario={handleTestBuilderScenario}
              lang={lang}
            />
          )}

          {currentView === 'norms' && <NormsLibrary lang={lang} />}
        </main>
        <Footer lang={lang} />
      </div>
    </LanguageContext.Provider>
  );
};
