import React from 'react';
import { MapPin, Calendar, Bookmark } from 'lucide-react';
import type { FestivalEdition } from '../data/festivalData';
import { t, formatDatesByLang } from '../utils/translations';
import type { Language } from '../utils/translations';

interface FestivalCardProps {
  edition: FestivalEdition;
  language: Language;
  onClick: () => void;
  isFollowed?: boolean;
  onToggleFollow?: (e: React.MouseEvent) => void;
}

export const FestivalCard: React.FC<FestivalCardProps> = ({
  edition,
  language,
  onClick,
  isFollowed = false,
  onToggleFollow,
}) => {
  const { config, days } = edition;

  // Check if user has favorites
  const hasFavorites = (() => {
    try {
      const favsStr = window.localStorage.getItem(`af_${config.edicionId}_favorites`);
      if (favsStr) {
        const favs = JSON.parse(favsStr);
        return Array.isArray(favs) && favs.length > 0;
      }
    } catch (e) {
      // ignore
    }
    return false;
  })();

  const getStatus = () => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    if (todayStr > config.endDate) {
      return { label: t(language, 'finalizado'), color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.1)' };
    }
    if (todayStr >= config.startDate && todayStr <= config.endDate) {
      return { label: t(language, 'enVivo'), color: '#ff003c', bg: 'rgba(255, 0, 60, 0.15)', pulse: true };
    }
    if (hasFavorites) {
      return { label: t(language, 'agendaSaved'), color: '#00e676', bg: 'rgba(0, 230, 118, 0.12)' };
    }

    // Check if there are acts
    const hasActs = days && days.some(day => day.acts && day.acts.length > 0);
    if (hasActs) {
      return { label: t(language, 'hoursAvailable'), color: '#ffd600', bg: 'rgba(255, 214, 0, 0.12)' };
    } else {
      // If we have stages but no acts, horarios pendientes. If nothing, cartel anunciado.
      const hasStages = edition.stages && edition.stages.length > 0;
      if (hasStages) {
        return { label: t(language, 'hoursPending'), color: '#ff7a00', bg: 'rgba(255, 122, 0, 0.12)' };
      }
      return { label: t(language, 'lineupAnnounced'), color: '#ff2a85', bg: 'rgba(255, 42, 133, 0.12)' };
    }
  };

  const status = getStatus();

  return (
    <div
      onClick={onClick}
      className="glass-gradient-border neon-glow btn-interactive"
      style={{
        cursor: 'pointer',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height: '220px',
        position: 'relative',
        borderRadius: '16px',
        transition: 'transform 0.2s, box-shadow 0.2s',
      }}
    >
      {/* Background Cartel with Blur Overlay */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `url(./images/${config.cartel})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.22,
          zIndex: 1,
        }}
      />

      {/* Top Left Follow/Bookmark Toggle Button */}
      {onToggleFollow && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFollow(e);
          }}
          style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            width: '28px',
            height: '28px',
            background: isFollowed ? 'rgba(255, 214, 0, 0.2)' : 'rgba(15, 17, 24, 0.75)',
            border: isFollowed ? '1px solid #ffd600' : '1px solid var(--border-color)',
            borderRadius: '8px',
            color: isFollowed ? '#ffd600' : 'var(--text-secondary)',
            cursor: 'pointer',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.2s, border-color 0.2s, color 0.2s',
          }}
          className="btn-interactive"
        >
          <Bookmark size={14} fill={isFollowed ? '#ffd600' : 'none'} />
        </button>
      )}

      {/* Top Status Badge */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          padding: '4px 10px',
          background: status.bg,
          borderRadius: '8px',
          border: `1px solid ${status.color}`,
          color: status.color,
          fontSize: '0.68rem',
          fontWeight: '800',
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        {status.pulse && (
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: status.color,
              boxShadow: `0 0 6px ${status.color}`,
              display: 'inline-block',
              animation: 'pulseYellow 1.5s infinite ease-in-out',
            }}
          />
        )}
        {status.label}
      </div>

      {/* Content Container */}
      <div
        style={{
          position: 'relative',
          zIndex: 5,
          padding: '16px 20px 20px 20px',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
        }}
      >
        {/* Logo/Icon if available */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            <img
              src={`./images/${config.logo}`}
              alt=""
              style={{ width: '80%', height: '80%', objectFit: 'contain' }}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        </div>

        {/* Text Details */}
        <div>
          <h3
            style={{
              fontSize: '1.15rem',
              fontWeight: '800',
              color: '#ffffff',
              lineHeight: 1.2,
              marginBottom: '6px',
            }}
          >
            {config.visibleName}
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)', fontSize: '0.78rem', marginBottom: '4px' }}>
            <MapPin size={12} color="var(--accent-red)" />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{config.location}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
            <Calendar size={12} color="var(--text-muted)" />
            <span>{formatDatesByLang(language, config.startDate, config.endDate)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
