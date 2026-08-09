import React from 'react';
import { Calendar, MapPin } from 'lucide-react';
import type { FestivalEdition } from '../data/festivalData';
import { formatDatesByLang, t } from '../utils/translations';
import type { Language } from '../utils/translations';
import { storage } from '../services/storage';

interface FestivalCardProps {
  edition: FestivalEdition;
  language: Language;
  onClick: () => void;
  isFollowed?: boolean;
  onToggleFollow?: () => void;
  variant?: 'standard' | 'featured';
}

export const FestivalCard: React.FC<FestivalCardProps> = ({
  edition,
  language,
  onClick,
  isFollowed = false,
  onToggleFollow,
  variant = 'standard',
}) => {
  const { config, days } = edition;
  const hasFavorites = storage.getJson<unknown[]>(`af_${config.edicionId}_favorites`, []).length > 0;

  const getStatus = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    if (todayStr > config.endDate) return { label: t(language, 'finalizado'), tone: 'neutral' };
    if (todayStr >= config.startDate) return { label: t(language, 'enVivo'), tone: 'live' };

    const start = new Date(`${config.startDate}T00:00:00`);
    const daysUntil = Math.ceil((start.getTime() - today.getTime()) / 86_400_000);
    if (daysUntil > 0) {
      const label = language === 'es'
        ? `Empieza en ${daysUntil} ${daysUntil === 1 ? 'día' : 'días'}`
        : language === 'en'
          ? `Starts in ${daysUntil} ${daysUntil === 1 ? 'day' : 'days'}`
          : `Commence dans ${daysUntil} ${daysUntil === 1 ? 'jour' : 'jours'}`;
      return { label, tone: 'upcoming' };
    }
    if (hasFavorites) return { label: t(language, 'agendaSaved'), tone: 'saved' };

    const hasActs = days?.some((day) => day.acts?.length > 0);
    if (hasActs) return { label: t(language, 'hoursAvailable'), tone: 'warning' };
    return { label: edition.stages?.length ? t(language, 'hoursPending') : t(language, 'lineupAnnounced'), tone: 'warning' };
  };

  const status = getStatus();

  return (
    <article className={`af-festival-card af-festival-card--${variant}`}>
      <button className="af-festival-card-main" onClick={onClick} aria-label={`${config.visibleName}. ${formatDatesByLang(language, config.startDate, config.endDate)}`}>
        <img className="af-festival-card-poster" src={`./images/${config.cartel}?v=3`} alt="" />
        <span className="af-festival-card-scrim" />
        <span className={`af-status-chip af-status-chip--${status.tone}`}>{status.label}</span>

        <span className="af-festival-card-content">
          {variant === 'featured' && <span className="af-kicker">TU PRÓXIMA CITA</span>}
          <strong>{config.visibleName}</strong>
          <span className="af-festival-card-meta">
            <span><Calendar size={14} />{formatDatesByLang(language, config.startDate, config.endDate)}</span>
            <span><MapPin size={14} />{config.location}</span>
          </span>
          {variant === 'featured' && <span className="af-festival-card-link">Ver festival <span aria-hidden="true">→</span></span>}
        </span>
      </button>

      {onToggleFollow && (
        <button
          className={`af-follow-toggle${isFollowed ? ' is-followed' : ''}`}
          onClick={onToggleFollow}
          aria-pressed={isFollowed}
          aria-label={isFollowed
            ? `${language === 'es' ? 'Dejar de seguir' : 'Unfollow'} ${config.visibleName}`
            : `${language === 'es' ? 'Seguir' : 'Follow'} ${config.visibleName}`}
        >
          <img src="./images/favicon.png" alt="" />
        </button>
      )}
    </article>
  );
};
