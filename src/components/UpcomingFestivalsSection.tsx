import React, { useMemo } from 'react';
import type { FestivalEdition } from '../data/festivalData';
import { UpcomingFestivalRow } from './UpcomingFestivalRow';
import { t } from '../utils/translations';
import type { Language } from '../utils/translations';

interface UpcomingFestivalsSectionProps {
  editions: FestivalEdition[];
  language: Language;
  onSelectEdition: (id: string) => void;
  onShowAll: () => void;
}

export const UpcomingFestivalsSection: React.FC<UpcomingFestivalsSectionProps> = ({
  editions,
  language,
  onSelectEdition,
  onShowAll,
}) => {
  // Determine which festivals are already in "My Festivals" to exclude them
  const myEditionsIds = useMemo(() => {
    return editions.filter(ed => {
      const edId = ed.config.edicionId;
      const lastOpened = window.localStorage.getItem('af_last_opened_edition');
      const isLastOpened = lastOpened === edId;

      let hasFavs = false;
      try {
        const favsStr = window.localStorage.getItem(`af_${edId}_favorites`);
        if (favsStr) {
          const favs = JSON.parse(favsStr);
          hasFavs = Array.isArray(favs) && favs.length > 0;
        }
      } catch (e) {
        // ignore
      }

      return isLastOpened || hasFavs;
    }).map(ed => ed.config.edicionId);
  }, [editions]);

  const upcomingEditions = useMemo(() => {
    // Exclude myEditionsIds, unless there are no other festivals to display
    let filtered = editions.filter(ed => !myEditionsIds.includes(ed.config.edicionId));
    if (filtered.length === 0) {
      filtered = editions; // Show all if upcoming list would otherwise be empty
    }

    // Sort by start date ascending
    return filtered.sort((a, b) => a.config.startDate.localeCompare(b.config.startDate));
  }, [editions, myEditionsIds]);

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
        >
          {t(language, 'verTodos')}
        </button>
      </div>

      {upcomingEditions.length === 0 ? (
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
          {upcomingEditions.map(ed => (
            <UpcomingFestivalRow
              key={ed.config.edicionId}
              edition={ed}
              language={language}
              onClick={() => onSelectEdition(ed.config.edicionId)}
            />
          ))}
        </div>
      )}
    </section>
  );
};
