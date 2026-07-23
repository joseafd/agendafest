import { lazy, Suspense, useEffect, useState } from 'react';
import type { FestivalEdition } from './data/festivalData';
import type { Language } from './utils/translations';

const agendaFestDataPromise = import('./data/festivalData');
const globalHomePromise = import('./components/GlobalHome');

const GlobalHome = lazy(() => globalHomePromise.then((module) => ({
  default: module.GlobalHome,
})));

const FestivalDashboard = lazy(() => import('./components/FestivalDashboard').then((module) => ({
  default: module.FestivalDashboard,
})));

const LoadingScreen = () => (
  <div
    className="app-container"
    role="status"
    aria-live="polite"
    style={{
      display: 'grid',
      minHeight: '100dvh',
      placeItems: 'center',
      background: '#08090d',
      color: '#ffffff',
    }}
  >
    <div style={{ display: 'grid', justifyItems: 'center', gap: '14px' }}>
      <img src="./icon.svg" alt="" width="72" height="72" />
      <strong style={{ letterSpacing: '1.5px' }}>Cargando AgendaFest…</strong>
    </div>
  </div>
);

export default function App() {
  const [agendaFestData, setAgendaFestData] = useState<Record<string, FestivalEdition> | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [selectedEditionId, setSelectedEditionId] = useState<string | null>(() => {
    return window.localStorage.getItem('af_selected_edition_id');
  });

  const [language, setLanguage] = useState<Language>(() => {
    const storedLanguage = window.localStorage.getItem('af_language');
    return storedLanguage === 'es' || storedLanguage === 'en' || storedLanguage === 'fr'
      ? storedLanguage
      : 'es';
  });

  useEffect(() => {
    if (selectedEditionId) {
      window.localStorage.setItem('af_selected_edition_id', selectedEditionId);
      window.localStorage.setItem('af_last_opened_edition', selectedEditionId);
    } else {
      window.localStorage.removeItem('af_selected_edition_id');
    }
  }, [selectedEditionId]);

  useEffect(() => {
    window.localStorage.setItem('af_language', language);
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    let mounted = true;

    agendaFestDataPromise
      .then((module) => {
        if (mounted) setAgendaFestData(module.agendaFestData);
      })
      .catch(() => {
        if (mounted) setLoadError(true);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // If a shared favorites link is loaded, default to the shared edition or first edition if none selected
  useEffect(() => {
    if (!agendaFestData) return;

    const params = new URLSearchParams(window.location.search);
    if (params.has('favs') && !selectedEditionId) {
      const editionParam = params.get('edition');
      if (editionParam && agendaFestData[editionParam]) {
        setSelectedEditionId(editionParam);
      } else {
        const firstEditionId = Object.keys(agendaFestData)[0];
        if (firstEditionId) {
          setSelectedEditionId(firstEditionId);
        }
      }
    }
  }, [agendaFestData, selectedEditionId]);

  if (loadError) {
    return (
      <div className="app-container" role="alert" style={{ padding: '32px', color: '#ffffff' }}>
        No se han podido cargar los datos. Comprueba tu conexión y vuelve a intentarlo.
      </div>
    );
  }

  if (!agendaFestData) {
    return <LoadingScreen />;
  }

  const editionsList = Object.values(agendaFestData);

  if (!selectedEditionId || !agendaFestData[selectedEditionId]) {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <GlobalHome
          editions={editionsList}
          onSelectEdition={setSelectedEditionId}
          language={language}
          onChangeLanguage={setLanguage}
        />
      </Suspense>
    );
  }

  const selectedEdition = agendaFestData[selectedEditionId];

  return (
    <Suspense fallback={<LoadingScreen />}>
      <FestivalDashboard
        key={selectedEditionId}
        editionId={selectedEditionId}
        edition={selectedEdition}
        onBackToSelector={() => setSelectedEditionId(null)}
        language={language}
        onChangeLanguage={setLanguage}
      />
    </Suspense>
  );
}
