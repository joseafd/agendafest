import { useState, useEffect } from 'react';
import { FestivalSelector } from './components/FestivalSelector';
import { FestivalDashboard } from './components/FestivalDashboard';
import { agendaFestData } from './data/festivalData';
import type { Language } from './utils/translations';

export default function App() {
  const [selectedEditionId, setSelectedEditionId] = useState<string | null>(() => {
    return window.localStorage.getItem('af_selected_edition_id');
  });

  const [language, setLanguage] = useState<Language>(() => {
    return (window.localStorage.getItem('af_language') as Language) || 'es';
  });

  useEffect(() => {
    if (selectedEditionId) {
      window.localStorage.setItem('af_selected_edition_id', selectedEditionId);
    } else {
      window.localStorage.removeItem('af_selected_edition_id');
    }
  }, [selectedEditionId]);

  useEffect(() => {
    window.localStorage.setItem('af_language', language);
  }, [language]);

  // If a shared favorites link is loaded, default to the first edition if none selected
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('favs') && !selectedEditionId) {
      const firstEditionId = Object.keys(agendaFestData)[0];
      if (firstEditionId) {
        setSelectedEditionId(firstEditionId);
      }
    }
  }, [selectedEditionId]);

  const editionsList = Object.values(agendaFestData);

  if (!selectedEditionId || !agendaFestData[selectedEditionId]) {
    return (
      <FestivalSelector
        editions={editionsList}
        onSelectEdition={setSelectedEditionId}
        language={language}
        onChangeLanguage={setLanguage}
      />
    );
  }

  const selectedEdition = agendaFestData[selectedEditionId];

  return (
    <FestivalDashboard
      key={selectedEditionId}
      editionId={selectedEditionId}
      edition={selectedEdition}
      onBackToSelector={() => setSelectedEditionId(null)}
      language={language}
      onChangeLanguage={setLanguage}
    />
  );
}
