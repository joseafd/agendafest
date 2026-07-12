import React from 'react';
import { MapPin, Calendar, ArrowRight } from 'lucide-react';
import type { FestivalEdition } from '../data/festivalData';
import { t, formatDatesByLang } from '../utils/translations';
import type { Language } from '../utils/translations';

interface UpcomingFestivalRowProps {
  edition: FestivalEdition;
  language: Language;
  onClick: () => void;
  isFollowed?: boolean;
  onToggleFollow?: (e: React.MouseEvent) => void;
}

export const UpcomingFestivalRow: React.FC<UpcomingFestivalRowProps> = ({
  edition,
  language,
  onClick,
  isFollowed = false,
  onToggleFollow,
}) => {
  const { config, days } = edition;

  const getStatus = () => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    if (todayStr > config.endDate) {
      return { label: t(language, 'finalizado'), color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.1)' };
    }
    if (todayStr >= config.startDate && todayStr <= config.endDate) {
      return { label: t(language, 'enVivo'), color: '#ff003c', bg: 'rgba(255, 0, 60, 0.15)', pulse: true };
    }

    const hasActs = days && days.some(day => day.acts && day.acts.length > 0);
    if (hasActs) {
      return { label: t(language, 'hoursAvailable'), color: '#ffd600', bg: 'rgba(255, 214, 0, 0.12)' };
    } else {
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
      className="glass btn-interactive"
      style={{
        cursor: 'pointer',
        padding: '12px 16px',
        borderRadius: '16px',
        border: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
        transition: 'transform 0.15s, border-color 0.2s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
        {/* Small Logo */}
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          <img
            src={`./images/${config.logo}?v=2`}
            alt=""
            style={{ width: '80%', height: '80%', objectFit: 'contain' }}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>

        {/* Details */}
        <div style={{ overflow: 'hidden' }}>
          <h4
            style={{
              fontSize: '1rem',
              fontWeight: '800',
              color: '#ffffff',
              margin: '0 0 2px 0',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {config.visibleName}
          </h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.74rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
              <MapPin size={10} color="var(--accent-red)" />
              <span>{config.location}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
              <Calendar size={10} color="var(--text-muted)" />
              <span>{formatDatesByLang(language, config.startDate, config.endDate)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side: Badge and Arrow */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        {onToggleFollow && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFollow(e);
            }}
            style={{
              background: isFollowed ? 'rgba(255, 42, 133, 0.15)' : 'rgba(255, 255, 255, 0.02)',
              border: isFollowed ? '1px solid #ff2a85' : '1px solid var(--border-color)',
              color: isFollowed ? '#ff2a85' : 'var(--text-secondary)',
              borderRadius: '6px',
              padding: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s, border-color 0.2s, color 0.2s',
            }}
            className="btn-interactive"
            title={isFollowed ? 'Quitar de mis favoritos' : 'Añadir a mis favoritos'}
          >
            <img 
              src="./images/favicon.png" 
              alt="" 
              style={{ 
                width: '12px', 
                height: '12px', 
                objectFit: 'contain', 
                filter: isFollowed ? 'none' : 'grayscale(100%) opacity(0.4) brightness(1.5)' 
              }} 
            />
          </button>
        )}
        <span
          style={{
            padding: '3px 8px',
            background: status.bg,
            border: `1px solid ${status.color}`,
            color: status.color,
            borderRadius: '6px',
            fontSize: '0.62rem',
            fontWeight: '800',
            textTransform: 'uppercase',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px',
          }}
        >
          {status.pulse && (
            <span
              style={{
                width: '4px',
                height: '4px',
                borderRadius: '50%',
                background: status.color,
                display: 'inline-block',
                animation: 'pulseYellow 1.5s infinite ease-in-out',
              }}
            />
          )}
          {status.label}
        </span>
        <ArrowRight size={14} color="var(--text-muted)" />
      </div>
    </div>
  );
};
