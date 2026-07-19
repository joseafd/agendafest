import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import type { Act, FestivalDay, StageConfig } from '../data/festivalData';
import type { Language } from '../utils/translations';

interface LineupViewProps {
  days: FestivalDay[];
  stages: StageConfig[];
  selectedDayId: string;
  onSelectDay: (dayId: string) => void;
  onSelectAct: (act: Act) => void;
  onBackToHome: () => void;
  festivalName: string;
  language: Language;
}

const normalizeBandImageName = (band: string) => band
  .toUpperCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^A-Z0-9\s-]/g, '')
  .trim()
  .replace(/[\s-]+/g, ' ');

const LineupImage: React.FC<{ act: Act }> = ({ act }) => {
  const localImage = `./images/${normalizeBandImageName(act.band)}.jpg`;
  const candidates = [act.bio?.imageUrl, localImage, './images/FONDO.jpg'].filter(Boolean) as string[];
  const [candidateIndex, setCandidateIndex] = useState(0);

  useEffect(() => setCandidateIndex(0), [act.id]);

  return (
    <img
      src={candidates[Math.min(candidateIndex, candidates.length - 1)]}
      alt={act.band}
      loading="lazy"
      onError={() => setCandidateIndex((current) => Math.min(current + 1, candidates.length - 1))}
      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
    />
  );
};

export const LineupView: React.FC<LineupViewProps> = ({
  days,
  stages,
  selectedDayId,
  onSelectDay,
  onSelectAct,
  onBackToHome,
  festivalName,
  language,
}) => {
  const [selectedStage, setSelectedStage] = useState('ALL');
  const selectedDay = days.find((day) => day.id === selectedDayId) || days[0];

  const availableStages = useMemo(() => {
    if (!selectedDay) return [];
    const stageNames = new Set(selectedDay.acts.map((act) => act.stage));
    return stages
      .filter((stage) => stageNames.has(stage.name))
      .sort((a, b) => a.order - b.order);
  }, [selectedDay, stages]);

  const visibleActs = useMemo(() => {
    if (!selectedDay) return [];
    return selectedDay.acts
      .filter((act) => selectedStage === 'ALL' || act.stage === selectedStage)
      .sort((a, b) => a.startMinutes - b.startMinutes || a.stage.localeCompare(b.stage));
  }, [selectedDay, selectedStage]);

  useEffect(() => {
    if (selectedStage !== 'ALL' && !availableStages.some((stage) => stage.name === selectedStage)) {
      setSelectedStage('ALL');
    }
  }, [availableStages, selectedStage]);

  const allLabel = language === 'en' ? 'ALL' : language === 'fr' ? 'TOUS' : 'TODOS';

  return (
    <div className="app-container animate-fade-in lineup-view">
      <header className="lineup-header">
        <button onClick={onBackToHome} aria-label="Volver al inicio" className="lineup-back btn-interactive">
          <ArrowLeft size={20} />
        </button>
        <div className="lineup-heading">
          <h1>LINE-UP</h1>
          <span>{festivalName}</span>
        </div>
        <div className="lineup-header-spacer" />
      </header>

      <nav className="lineup-day-tabs" aria-label="Filtrar por día">
        {days.map((day) => {
          const active = day.id === selectedDay?.id;
          return (
            <button
              key={day.id}
              onClick={() => onSelectDay(day.id)}
              className={active ? 'active' : ''}
              aria-pressed={active}
            >
              <strong>{day.weekdayEs || day.dayLabel}</strong>
              <span>{day.dayLabel}</span>
            </button>
          );
        })}
      </nav>

      <nav className="lineup-stage-tabs" aria-label="Filtrar por escenario">
        <button
          onClick={() => setSelectedStage('ALL')}
          className={selectedStage === 'ALL' ? 'active' : ''}
          aria-pressed={selectedStage === 'ALL'}
        >
          {allLabel}
        </button>
        {availableStages.map((stage) => (
          <button
            key={stage.id}
            onClick={() => setSelectedStage(stage.name)}
            className={selectedStage === stage.name ? 'active' : ''}
            aria-pressed={selectedStage === stage.name}
          >
            {stage.name}
          </button>
        ))}
      </nav>

      <main className="lineup-grid" aria-live="polite">
        {visibleActs.map((act) => (
          <button
            key={act.id}
            className="lineup-card btn-interactive"
            onClick={() => onSelectAct(act)}
            aria-label={`${act.band}, ${act.start}–${act.end}${selectedStage === 'ALL' ? `, ${act.stage}` : ''}`}
          >
            <LineupImage act={act} />
            <span className="lineup-card-shade" />
            <span className="lineup-card-copy">
              <strong>{act.band}</strong>
              <span>{act.start} · {act.end}</span>
              {selectedStage === 'ALL' && <span className="lineup-card-stage">{act.stage}</span>}
            </span>
          </button>
        ))}
        {visibleActs.length === 0 && (
          <div className="lineup-empty">
            {language === 'en' ? 'No performances for this selection.' : language === 'fr' ? 'Aucun concert pour cette sélection.' : 'No hay actuaciones para esta selección.'}
          </div>
        )}
      </main>
    </div>
  );
};
