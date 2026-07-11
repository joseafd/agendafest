import React, { useMemo } from 'react';
import type { FestivalEdition } from '../data/festivalData';
import { FestivalCard } from './FestivalCard';
import { t } from '../utils/translations';
import type { Language } from '../utils/translations';
import { MoreHorizontal } from 'lucide-react';

interface FinishedFestivalsSectionProps {
  editions: FestivalEdition[];
  language: Language;
  onSelectEdition: (id: string) => void;
  followedEditions: string[];
  onToggleFollow: (id: string) => void;
  onOpenSavedModal: () => void;
  onOpenHistoricalModal: () => void;
}

export const FinishedFestivalsSection: React.FC<FinishedFestivalsSectionProps> = ({
  editions,
  language,
  onSelectEdition,
  followedEditions,
  onToggleFollow,
  onOpenSavedModal,
  onOpenHistoricalModal,
}) => {
  const todayStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);

  // Filter finished editions (endDate < todayStr)
  const finishedEditions = useMemo(() => {
    return editions.filter(ed => ed.config.endDate < todayStr);
  }, [editions, todayStr]);

  // Separate saved (followed or has fav bands) vs historical
  const { savedFinished, historical } = useMemo(() => {
    const saved: FestivalEdition[] = [];
    const hist: FestivalEdition[] = [];

    finishedEditions.forEach(ed => {
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

      if (isFollowed || hasFavs) {
        saved.push(ed);
      } else {
        hist.push(ed);
      }
    });

    // Sort descending (most recent first)
    const sortByDateDesc = (a: FestivalEdition, b: FestivalEdition) => 
      b.config.endDate.localeCompare(a.config.endDate);

    saved.sort(sortByDateDesc);
    hist.sort(sortByDateDesc);

    return { savedFinished: saved, historical: hist };
  }, [finishedEditions, followedEditions]);

  // If there are no finished editions at all, do not render this section
  if (finishedEditions.length === 0) return null;

  // Show up to 2 of the most recent saved finished festivals
  const displayedSaved = savedFinished.slice(0, 2);

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
          
          {/* Historical "..." (MAS) Button */}
          {historical.length > 0 && (
            <button
              onClick={onOpenHistoricalModal}
              title={language === 'es' ? 'Ver histórico completo' : 'View full archive'}
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)',
                borderRadius: '8px',
                padding: '4px 8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s',
              }}
              className="btn-interactive"
            >
              <MoreHorizontal size={16} />
              <span style={{ fontSize: '0.68rem', fontWeight: '800', marginLeft: '4px', textTransform: 'uppercase' }}>
                {language === 'es' ? 'Histórico' : 'Archive'}
              </span>
            </button>
          )}
        </div>

        {/* Ver todos button for saved finished ones */}
        {savedFinished.length > 2 && (
          <button
            onClick={onOpenSavedModal}
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
        )}
      </div>

      {savedFinished.length === 0 ? (
        /* Empty State */
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px 20px',
            background: 'rgba(255, 255, 255, 0.01)',
            border: '1px dashed var(--border-color)',
            borderRadius: '16px',
            textAlign: 'center',
            gap: '8px',
          }}
        >
          <span style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
            {language === 'es' 
              ? 'No tienes agendas guardadas en festivales finalizados.' 
              : 'No saved schedules for past festivals.'}
          </span>
          {historical.length > 0 && (
            <button
              onClick={onOpenHistoricalModal}
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)',
                fontSize: '0.78rem',
                fontWeight: '700',
                padding: '6px 14px',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
              className="btn-interactive"
            >
              {language === 'es' ? 'Explorar Histórico' : 'Explore Archive'}
            </button>
          )}
        </div>
      ) : (
        /* Display 2 most recent saved finished festivals */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: '12px',
            width: '100%',
          }}
        >
          {displayedSaved.map(ed => (
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
