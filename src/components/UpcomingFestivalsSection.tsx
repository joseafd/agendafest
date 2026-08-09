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

  const upcomingEditions = useMemo(() => editions
    .filter((edition) => edition.config.endDate >= todayStr)
    .sort((a, b) => a.config.startDate.localeCompare(b.config.startDate)), [editions, todayStr]);

  const [nextEdition, ...rest] = upcomingEditions;
  const displayedRest = rest.slice(0, 2);
  const title = language === 'es' ? 'Tu próxima cita' : language === 'en' ? 'Your next festival' : 'Votre prochain festival';

  return (
    <section id="upcoming-festivals-section" className="af-upcoming-section">
      <div className="af-section-heading">
        <div>
          <span className="af-kicker">{language === 'es' ? 'DESCUBRIR' : language === 'en' ? 'DISCOVER' : 'DÉCOUVRIR'}</span>
          <h1>{title}</h1>
        </div>
        {upcomingEditions.length > 2 && (
          <button className="af-text-button" onClick={onShowAll}>{t(language, 'verTodos')}</button>
        )}
      </div>

      {!nextEdition ? (
        <div className="af-empty-state">{t(language, 'noUpcomingFestivals')}</div>
      ) : (
        <>
          <FestivalCard
            edition={nextEdition}
            language={language}
            onClick={() => onSelectEdition(nextEdition.config.edicionId)}
            isFollowed={followedEditions.includes(nextEdition.config.edicionId)}
            onToggleFollow={() => onToggleFollow(nextEdition.config.edicionId)}
            variant="featured"
          />

          {displayedRest.length > 0 && (
            <div className="af-upcoming-more">
              <h2>{t(language, 'upcomingFestivals')}</h2>
              <div className="af-festival-grid">
                {displayedRest.map((edition) => (
                  <FestivalCard
                    key={edition.config.edicionId}
                    edition={edition}
                    language={language}
                    onClick={() => onSelectEdition(edition.config.edicionId)}
                    isFollowed={followedEditions.includes(edition.config.edicionId)}
                    onToggleFollow={() => onToggleFollow(edition.config.edicionId)}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
};
