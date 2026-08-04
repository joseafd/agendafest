import React, { useMemo } from 'react';
import type { FestivalEdition } from '../data/festivalData';
import { FestivalCard } from './FestivalCard';
import { t } from '../utils/translations';
import type { Language } from '../utils/translations';

interface UpcomingFestivalsSectionProps {
  editions: FestivalEdition[];
  language: Language;
  onSelectEdition: (id: string) => void;
  onShowAll: () => void;
  followedEditions: string[];
  onToggleFollow: (id: string) => void;
}

export const UpcomingFestivalsSection: React.FC<UpcomingFestivalsSectionProps> = ({
  editions,
  language,
  onSelectEdition,
  onShowAll,
  followedEditions,
  onToggleFollow,
}) => {
  const todayStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);

  // Filter active or future editions and sort chronologically ascending
  const upcomingEditions = useMemo(() => {
    return editions
      .filter(ed => ed.config.endDate >= todayStr)
      .sort((a, b) => a.config.startDate.localeCompare(b.config.startDate));
  }, [editions, todayStr]);

  // Show up to 2 on the home page
  const displayedUpcoming = upcomingEditions.slice(0, 2);

  return (
    <section
      id="upcoming-festivals-section"
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        marginBottom: '32px',
        animation: 'fadeIn 0.4s ease-out 0.4s both',
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
          {t(language, 'upcomingFestivals')}
        </h3>

        {/* Ver todos button (shown only when there are more upcoming editions than visible cards) */}
        {upcomingEditions.length > 2 && (
          <button
            onClick={onShowAll}
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

      {upcomingEditions.length === 0 ? (
        /* Empty State */
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px 16px',
            background: 'rgba(255, 255, 255, 0.01)',
            border: '1px dashed var(--border-color)',
            borderRadius: '16px',
            textAlign: 'center',
          }}
        >
          <span style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
            {t(language, 'noUpcomingFestivals')}
          </span>
        </div>
      ) : (
        /* Grid Display (up to 2 cards) */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: '12px',
            width: '100%',
          }}
        >
          {displayedUpcoming.map(ed => (
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
      )}
    </section>
  );
};
