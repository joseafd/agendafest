import React, { useMemo } from 'react';
import type { FestivalEdition } from '../data/festivalData';
import { FestivalCard } from './FestivalCard';
import { t } from '../utils/translations';
import type { Language } from '../utils/translations';

interface MyFestivalsSectionProps {
  editions: FestivalEdition[];
  language: Language;
  onSelectEdition: (id: string) => void;
  onScrollToUpcoming: () => void;
  onShowAll: () => void;
  followedEditions: string[];
  onToggleFollow: (id: string) => void;
}

export const MyFestivalsSection: React.FC<MyFestivalsSectionProps> = ({
  editions,
  language,
  onSelectEdition,
  onScrollToUpcoming,
  onShowAll,
  followedEditions,
  onToggleFollow,
}) => {
  const todayStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);

  // Filter followed/favorited festivals of all time (past, active, or future)
  const allMyEditions = useMemo(() => {
    const filtered = editions.filter(ed => {
      const edId = ed.config.edicionId;
      const isFollowed = followedEditions.includes(edId);

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

      return isFollowed || hasFavs;
    });

    return filtered.sort((a, b) => a.config.startDate.localeCompare(b.config.startDate));
  }, [editions, followedEditions]);

  // Filter followed/favorited festivals that are active or upcoming (endDate >= todayStr)
  const myActiveOrFutureEditions = useMemo(() => {
    return allMyEditions.filter(ed => ed.config.endDate >= todayStr);
  }, [allMyEditions, todayStr]);

  // Show up to 2 cards on the home page
  const displayedMyFestivals = myActiveOrFutureEditions.slice(0, 2);

  return (
    <section
      id="my-festivals-section"
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        marginBottom: '32px',
        animation: 'fadeIn 0.4s ease-out 0.2s both',
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
          {t(language, 'myFestivals')}
        </h3>

        {/* Ver todos button (shown if total followed/favorited editions of all time > 2) */}
        {allMyEditions.length > 2 && (
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

      {myActiveOrFutureEditions.length === 0 ? (
        /* Empty State */
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '32px 20px',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px dashed var(--border-color)',
            borderRadius: '16px',
            textAlign: 'center',
            gap: '16px',
          }}
        >
          <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
            {t(language, 'noSavedFestivals')}
          </span>
          <button
            onClick={onScrollToUpcoming}
            style={{
              background: 'rgba(255, 42, 133, 0.1)',
              border: '1px solid rgba(255, 42, 133, 0.3)',
              color: '#ff2a85',
              fontSize: '0.8rem',
              fontWeight: '800',
              padding: '10px 18px',
              borderRadius: '10px',
              cursor: 'pointer',
              boxShadow: '0 4px 10px rgba(0, 0, 0, 0.2)',
              transition: 'background 0.2s',
            }}
            className="btn-interactive"
          >
            {t(language, 'viewUpcomingFestivals')}
          </button>
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
          {displayedMyFestivals.map(ed => (
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
