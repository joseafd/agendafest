import React, { useMemo } from 'react';
import type { FestivalEdition } from '../data/festivalData';
import { FestivalCard } from './FestivalCard';
import { t } from '../utils/translations';
import type { Language } from '../utils/translations';

interface FinishedFestivalsSectionProps {
  editions: FestivalEdition[];
  language: Language;
  onSelectEdition: (id: string) => void;
  followedEditions: string[];
  onToggleFollow: (id: string) => void;
  onOpenAllFinishedModal: () => void;
}

export const FinishedFestivalsSection: React.FC<FinishedFestivalsSectionProps> = ({
  editions,
  language,
  onSelectEdition,
  followedEditions,
  onToggleFollow,
  onOpenAllFinishedModal,
}) => {
  const todayStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);

  // Filter finished editions (endDate < todayStr) and sort descending (most recent first)
  const finishedEditions = useMemo(() => {
    return editions
      .filter(ed => ed.config.endDate < todayStr)
      .sort((a, b) => b.config.endDate.localeCompare(a.config.endDate));
  }, [editions, todayStr]);

  // If there are no finished editions, do not render this section
  if (finishedEditions.length === 0) return null;

  // Show up to 2 of the most recent finished festivals
  const displayedFinished = finishedEditions.slice(0, 2);

  return (
    <section
      id="finished-festivals-section"
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        marginBottom: '32px',
        animation: 'fadeIn 0.4s ease-out 0.5s both',
      }}
    >
      {/* Title block */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3
          style={{
            fontSize: '1.25rem',
            fontWeight: '900',
            color: '#ffffff',
            margin: 0,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          {language === 'es' ? 'Festivales finalizados' : language === 'en' ? 'Past Festivals' : 'Festivals Terminés'}
        </h3>

        {/* Ver todos button */}
        {finishedEditions.length > 2 && (
          <button
            onClick={onOpenAllFinishedModal}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent-red)',
              fontSize: '0.8rem',
              fontWeight: '700',
              cursor: 'pointer',
              padding: '4px 8px',
            }}
            className="btn-interactive"
          >
            {t(language, 'verTodos')}
          </button>
        )}
      </div>

      {/* Grid of finished festivals */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: '12px',
          width: '100%',
        }}
      >
        {displayedFinished.map(ed => (
          <FestivalCard
            key={ed.config.edicionId}
            edition={ed}
            language={language}
            onClick={() => onSelectEdition(ed.config.edicionId)}
            isFollowed={followedEditions.includes(ed.config.edicionId)}
            onToggleFollow={() => onToggleFollow(ed.config.edicionId)}
          />
        ))}
      </div>
    </section>
  );
};
