import React, { useState, useMemo } from 'react';
import { Calendar, MapPin, Search, List, LayoutGrid, ArrowRight } from 'lucide-react';
import type { FestivalEdition } from '../data/festivalData';
import { t, formatDatesByLang } from '../utils/translations';
import type { Language } from '../utils/translations';

interface FestivalSelectorProps {
  editions: FestivalEdition[];
  onSelectEdition: (id: string) => void;
  language: Language;
  onChangeLanguage: (lang: Language) => void;
}

export const FestivalSelector: React.FC<FestivalSelectorProps> = ({
  editions,
  onSelectEdition,
  language,
  onChangeLanguage,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'date'>('date');
  const [layoutMode, setLayoutMode] = useState<'grid' | 'list'>('grid');

  // Format date range nicely
  const formatFestivalDates = (start: string, end: string): string => {
    return formatDatesByLang(language, start, end);
  };

  // Determine status (Próximamente, En Vivo, Finalizado)
  const getFestivalStatus = (start: string, end: string) => {
    const now = new Date();
    // Normalize today date
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    if (todayStr < start) {
      return { label: t(language, 'proximamente'), color: '#ffd600', bg: 'rgba(255, 214, 0, 0.12)' };
    } else if (todayStr >= start && todayStr <= end) {
      return { label: t(language, 'enVivo'), color: '#ff003c', bg: 'rgba(255, 0, 60, 0.15)', pulse: true };
    } else {
      return { label: t(language, 'finalizado'), color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.1)' };
    }
  };

  // Filter and sort editions
  const filteredEditions = useMemo(() => {
    let result = editions.filter(ed => {
      const nameMatch = ed.config.festivalName.toLowerCase().includes(searchQuery.toLowerCase());
      const locationMatch = ed.config.location.toLowerCase().includes(searchQuery.toLowerCase());
      return nameMatch || locationMatch;
    });

    if (sortBy === 'name') {
      result.sort((a, b) => a.config.festivalName.localeCompare(b.config.festivalName));
    } else {
      result.sort((a, b) => a.config.startDate.localeCompare(b.config.startDate));
    }

    return result;
  }, [editions, searchQuery, sortBy]);

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: 'var(--bg-primary)',
        overflowY: 'auto',
        padding: '24px 16px',
        paddingTop: 'calc(24px + var(--safe-top))',
        paddingBottom: 'calc(24px + var(--safe-bottom))',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
      className="animate-fade-in"
    >
      {/* Header / Brand */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h1
          className="font-metal neon-text-glow"
          style={{
            fontSize: '2.5rem',
            lineHeight: 1,
            textTransform: 'uppercase',
            marginBottom: '4px',
          }}
        >
          AgendaFest
        </h1>
        <span
          style={{
            fontSize: '0.85rem',
            letterSpacing: '3px',
            color: 'var(--text-secondary)',
            fontWeight: 800,
            textTransform: 'uppercase',
          }}
        >
          {t(language, 'tuPortal')}
        </span>
      </div>

      {/* Controls Container (Search + Filters) */}
      <div
        className="glass responsive-content"
        style={{
          width: '100%',
          padding: '16px',
          borderRadius: '16px',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          marginBottom: '24px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
        }}
      >
        {/* Search Input */}
        <div style={{ position: 'relative', width: '100%' }}>
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
            }}
          />
          <input
            type="text"
            placeholder={t(language, 'buscarFestival')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px 12px 42px',
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              color: '#ffffff',
              fontSize: '0.92rem',
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => { e.target.style.borderColor = 'var(--accent-red)'; }}
            onBlur={(e) => { e.target.style.borderColor = 'var(--border-color)'; }}
          />
        </div>

        {/* Sort and Layout Selector Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          {/* Sorting Buttons */}
          <div style={{ display: 'flex', gap: '6px', background: 'rgba(0,0,0,0.2)', padding: '3px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <button
              onClick={() => setSortBy('date')}
              style={{
                border: 'none',
                background: sortBy === 'date' ? 'var(--accent-red)' : 'transparent',
                color: sortBy === 'date' ? '#fff' : 'var(--text-secondary)',
                padding: '6px 12px',
                fontSize: '0.8rem',
                fontWeight: '700',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'background 0.2s, color 0.2s',
              }}
            >
              {t(language, 'porFecha')}
            </button>
            <button
              onClick={() => setSortBy('name')}
              style={{
                border: 'none',
                background: sortBy === 'name' ? 'var(--accent-red)' : 'transparent',
                color: sortBy === 'name' ? '#fff' : 'var(--text-secondary)',
                padding: '6px 12px',
                fontSize: '0.8rem',
                fontWeight: '700',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'background 0.2s, color 0.2s',
              }}
            >
              {t(language, 'porNombre')}
            </button>
          </div>

          {/* Right Action Container: Flags + Layout Mode */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Language Toggle Button (ES -> EN -> FR -> ES) */}
            <button
              onClick={() => {
                if (language === 'es') onChangeLanguage('en');
                else if (language === 'en') onChangeLanguage('fr');
                else onChangeLanguage('es');
              }}
              aria-label={language === 'es' ? 'Cambiar idioma' : language === 'en' ? 'Change language' : 'Changer de langue'}
              title={language === 'es' ? 'Cambiar idioma' : language === 'en' ? 'Change language' : 'Changer de langue'}
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border-color)',
                fontSize: '1.15rem',
                cursor: 'pointer',
                padding: '7px 9px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s, transform 0.1s',
              }}
              className="btn-interactive"
              onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.95)'; }}
              onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              {language === 'es' ? '🇪🇸' : language === 'en' ? '🇬🇧' : '🇫🇷'}
            </button>

            {/* Layout Mode Button */}
            <button
              onClick={() => setLayoutMode(layoutMode === 'grid' ? 'list' : 'grid')}
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                padding: '8px',
                borderRadius: '10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title={layoutMode === 'grid' ? (language === 'en' ? 'List View' : language === 'fr' ? 'Vue en Liste' : 'Ver en Lista') : (language === 'en' ? 'Grid View' : language === 'fr' ? 'Vue en Grille' : 'Ver en Cuadrícula')}
            >
              {layoutMode === 'grid' ? <List size={18} /> : <LayoutGrid size={18} />}
            </button>
          </div>
        </div>
      </div>

      {/* Festivals Grid/List Wrapper */}
      <div className="responsive-content" style={{ width: '100%', flex: 1 }}>
        {filteredEditions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
            {t(language, 'noFestivales')}
          </div>
        ) : layoutMode === 'grid' ? (
          /* GRID VIEW */
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '20px',
              width: '100%',
            }}
          >
            {filteredEditions.map(ed => {
              const status = getFestivalStatus(ed.config.startDate, ed.config.endDate);
              return (
                <div
                  key={ed.config.edicionId}
                  onClick={() => onSelectEdition(ed.config.edicionId)}
                  className="glass-gradient-border neon-glow btn-interactive"
                  style={{
                    cursor: 'pointer',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    height: '240px',
                    position: 'relative',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  {/* Background Cartel with Blur Overlay */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundImage: `url(./images/${ed.config.cartel})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      opacity: 0.25,
                      zIndex: 1,
                      transition: 'opacity 0.2s',
                    }}
                  />

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
                      padding: '20px',
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
                          width: '56px',
                          height: '56px',
                          borderRadius: '12px',
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid var(--border-color)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                        }}
                      >
                        <img
                          src={`./images/${ed.config.logo}`}
                          alt="Logo"
                          style={{ width: '80%', height: '80%', objectFit: 'contain' }}
                          onError={(e) => {
                            // Fallback to text initials if image fails
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    </div>

                    {/* Text Details */}
                    <div>
                      <h2
                        style={{
                          fontSize: '1.2rem',
                          fontWeight: '800',
                          color: '#ffffff',
                          lineHeight: 1.2,
                          marginBottom: '4px',
                        }}
                      >
                        {ed.config.visibleName}
                      </h2>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '4px' }}>
                        <MapPin size={12} color="var(--accent-red)" />
                        <span>{ed.config.location}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                        <Calendar size={12} color="var(--text-muted)" />
                        <span>{formatFestivalDates(ed.config.startDate, ed.config.endDate)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* LIST VIEW */
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              width: '100%',
            }}
          >
            {filteredEditions.map(ed => {
              const status = getFestivalStatus(ed.config.startDate, ed.config.endDate);
              return (
                <div
                  key={ed.config.edicionId}
                  onClick={() => onSelectEdition(ed.config.edicionId)}
                  className="glass btn-interactive"
                  style={{
                    cursor: 'pointer',
                    padding: '16px',
                    borderRadius: '16px',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
                    transition: 'transform 0.15s',
                  }}
                  onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.98)'; }}
                  onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {/* Small Logo */}
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
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
                        src={`./images/${ed.config.logo}`}
                        alt="Logo"
                        style={{ width: '80%', height: '80%', objectFit: 'contain' }}
                      />
                    </div>

                    {/* Details */}
                    <div>
                      <h2 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#fff', marginBottom: '2px' }}>
                        {ed.config.visibleName}
                      </h2>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                          <MapPin size={10} color="var(--accent-red)" />
                          <span>{ed.config.location}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                          <Calendar size={10} color="var(--text-muted)" />
                          <span>{formatFestivalDates(ed.config.startDate, ed.config.endDate)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Status & Arrow */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
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
                      }}
                    >
                      {status.label}
                    </span>
                    <ArrowRight size={16} color="var(--text-secondary)" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
