import React from 'react';
import { Clock, LayoutGrid, SlidersHorizontal, Home, Share2, HelpCircle } from 'lucide-react';
import type { FestivalDay } from '../data/festivalData';
import { t, getLocalizedDayLabel } from '../utils/translations';
import type { Language } from '../utils/translations';

interface HeaderProps {
  days: FestivalDay[];
  selectedDayId: string;
  onSelectDay: (id: string) => void;
  viewMode: 'hours' | 'stages';
  onToggleViewMode: () => void;
  onOpenFilters: () => void;
  hasActiveFilters: boolean;
  onGoHome: () => void;
  onShare: () => void;
  onOpenPwaGuide: () => void;
  festivalName: string;
  location: string;
  year: number;
  language: Language;
  onChangeLanguage: (lang: Language) => void;
}

export const Header: React.FC<HeaderProps> = ({
  days,
  selectedDayId,
  onSelectDay,
  viewMode,
  onToggleViewMode,
  onOpenFilters,
  hasActiveFilters,
  onGoHome,
  onShare,
  onOpenPwaGuide,
  festivalName,
  location,
  year,
  language,
  onChangeLanguage,
}) => {
  return (
    <header
      className="glass"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        padding: '12px 16px',
        borderBottom: '1px solid var(--border-color)',
        borderTop: 'var(--safe-top) solid transparent',
        width: '100%',
      }}
    >
      <div className="responsive-content" style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
        {/* Top row: Home button, Logo, Action buttons container */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Left: Home Button */}
          <button
            onClick={onGoHome}
            aria-label={t(language, 'goHome')}
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              padding: '10px',
              borderRadius: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s, transform 0.1s',
            }}
            className="btn-interactive"
            onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.95)'; }}
            onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            <Home size={18} />
          </button>

          {/* Center: Logo */}
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
            <h1 className="font-metal" style={{ fontSize: '1.15rem', lineHeight: 1.1, textTransform: 'uppercase' }}>
              {festivalName}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <span style={{ fontSize: '0.65rem', letterSpacing: '2px', color: 'var(--text-secondary)', fontWeight: 800 }}>
                {location.toUpperCase()} {year}
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  background: 'rgba(0, 230, 118, 0.1)',
                  color: '#00e676',
                  fontSize: '0.55rem',
                  fontWeight: '800',
                  padding: '1px 5px',
                  borderRadius: '4px',
                  border: '1px solid rgba(0, 230, 118, 0.25)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.3px',
                  lineHeight: '1',
                }}
                title={language === 'en' ? 'Offline Mode Active' : language === 'fr' ? 'Mode hors ligne actif' : 'Modo sin conexión activo'}
              >
                <span
                  style={{
                    width: '4px',
                    height: '4px',
                    borderRadius: '50%',
                    background: '#00e676',
                    marginRight: '3.5px',
                    boxShadow: '0 0 6px #00e676',
                    animation: 'pulseYellow 2s infinite ease-in-out',
                  }}
                />
                {language === 'en' ? 'Offline' : language === 'fr' ? 'Hors ligne' : 'Sin conexión'}
              </span>
            </div>
          </div>

          {/* Right: Flags + Share + View Toggle + Filters Button Container */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* Language Flags */}
            <div style={{ display: 'flex', gap: '4px', marginRight: '4px' }}>
              <button
                onClick={() => onChangeLanguage('es')}
                style={{
                  background: language === 'es' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                  border: 'none',
                  fontSize: '1.1rem',
                  cursor: 'pointer',
                  borderRadius: '6px',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                  opacity: language === 'es' ? 1 : 0.4,
                }}
                className="btn-interactive"
                title="Español"
              >
                🇪🇸
              </button>
              <button
                onClick={() => onChangeLanguage('en')}
                style={{
                  background: language === 'en' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                  border: 'none',
                  fontSize: '1.1rem',
                  cursor: 'pointer',
                  borderRadius: '6px',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                  opacity: language === 'en' ? 1 : 0.4,
                }}
                className="btn-interactive"
                title="English"
              >
                🇬🇧
              </button>
              <button
                onClick={() => onChangeLanguage('fr')}
                style={{
                  background: language === 'fr' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                  border: 'none',
                  fontSize: '1.1rem',
                  cursor: 'pointer',
                  borderRadius: '6px',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                  opacity: language === 'fr' ? 1 : 0.4,
                }}
                className="btn-interactive"
                title="Français"
              >
                🇫🇷
              </button>
            </div>

            {/* Help/PWA Install Button */}
            <button
              onClick={onOpenPwaGuide}
              aria-label={t(language, 'helpTitle')}
              title={t(language, 'helpTitle')}
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                padding: '10px',
                borderRadius: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s, transform 0.1s',
              }}
              className="btn-interactive"
              onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.95)'; }}
              onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              <HelpCircle size={18} />
            </button>

            {/* Share Button */}
            <button
              onClick={onShare}
              aria-label={t(language, 'shareFavs')}
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                padding: '10px',
                borderRadius: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s, transform 0.1s',
              }}
              className="btn-interactive"
              onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.95)'; }}
              onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              <Share2 size={18} />
            </button>

            {/* View Toggle */}
            <button
              onClick={onToggleViewMode}
              aria-label={viewMode === 'hours' ? t(language, 'viewStages') : t(language, 'viewHours')}
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                padding: '10px',
                borderRadius: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s, transform 0.1s',
              }}
              className="btn-interactive"
              onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.95)'; }}
              onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              {viewMode === 'hours' ? <LayoutGrid size={18} /> : <Clock size={18} />}
            </button>

            {/* Filter Drawer Trigger */}
            <button
              onClick={onOpenFilters}
              aria-label={t(language, 'openFilters')}
              style={{
                background: hasActiveFilters ? 'rgba(255, 0, 60, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                border: `1px solid ${hasActiveFilters ? 'var(--accent-red)' : 'var(--border-color)'}`,
                color: hasActiveFilters ? 'var(--accent-red)' : 'var(--text-primary)',
                padding: '10px',
                borderRadius: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                transition: 'background 0.2s, border-color 0.2s, transform 0.1s',
              }}
              className="btn-interactive"
              onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.95)'; }}
              onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              <SlidersHorizontal size={18} />
              {hasActiveFilters && (
                <span
                  style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
                    width: '6px',
                    height: '6px',
                    backgroundColor: 'var(--accent-red)',
                    borderRadius: '50%',
                    boxShadow: '0 0 6px var(--accent-red)',
                  }}
                />
              )}
            </button>
          </div>
        </div>

        {/* Day Selector Segmented Control */}
        <div
          style={{
            display: 'flex',
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '14px',
            padding: '3px',
            border: '1px solid var(--border-color)',
          }}
        >
          {days.map((day) => {
            const isActive = day.id === selectedDayId;
            const localizedLabel = getLocalizedDayLabel(day.dayLabel, language);
            const labelParts = localizedLabel.split(' ');
            const shortLabel = `${labelParts[0].substring(0, 3)} ${labelParts[1] || ''}`;

            return (
              <button
                key={day.id}
                onClick={() => onSelectDay(day.id)}
                style={{
                  flex: 1,
                  border: 'none',
                  background: isActive ? 'var(--accent-red)' : 'transparent',
                  color: isActive ? '#ffffff' : 'var(--text-secondary)',
                  fontWeight: isActive ? '700' : '500',
                  fontSize: '0.95rem', /* Aumentado */
                  padding: '10px 4px', /* Aumentado */
                  borderRadius: '11px',
                  cursor: 'pointer',
                  transition: 'background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease',
                  boxShadow: isActive ? '0 4px 12px rgba(255, 0, 60, 0.3)' : 'none',
                  textAlign: 'center',
                }}
              >
                {shortLabel}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
