import React from 'react';
import { Zap, Clock, MapPin } from 'lucide-react';
import type { Act, StageConfig, FestivalDay } from '../data/festivalData';

const getStageGlassStyle = (color: string, isPlayingNow: boolean, isFavorite: boolean) => {
  let hex = color.replace('#', '');
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  const r = parseInt(hex.substring(0, 2), 16) || 255;
  const g = parseInt(hex.substring(2, 4), 16) || 255;
  const b = parseInt(hex.substring(4, 6), 16) || 255;
  const rgb = `${r}, ${g}, ${b}`;

  let borderAlpha = isPlayingNow ? "0.8" : (isFavorite ? "0.55" : "0.3");
  let bgAlpha = isPlayingNow ? "0.2" : "0.1";
  
  return {
    background: `rgba(${rgb}, ${bgAlpha})`,
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: `1px solid rgba(${rgb}, ${borderAlpha})`,
    boxShadow: isPlayingNow 
      ? `0 0 16px rgba(${rgb}, 0.35)` 
      : (isFavorite ? `0 0 10px rgba(${rgb}, 0.2)` : `0 4px 12px rgba(0, 0, 0, 0.4)`),
  };
};

interface HoursViewProps {
  acts: Act[];
  favorites: string[];
  onToggleFavorite: (id: string, e: React.MouseEvent) => void;
  onSelectAct: (act: Act) => void;
  showGlobalDayBadge?: boolean;
  currentTimeMinutes: number;
  shouldShowLive: boolean;
  conflictActIds: Set<string>;
  dayStartHour: number;
  editionStages: StageConfig[];
  days: FestivalDay[];
}

export const HoursView: React.FC<HoursViewProps> = ({
  acts,
  favorites,
  onToggleFavorite,
  onSelectAct,
  showGlobalDayBadge = false,
  currentTimeMinutes,
  shouldShowLive,
  conflictActIds,
  dayStartHour,
  editionStages,
  days,
}) => {
  const [imgErrors, setImgErrors] = React.useState<Record<string, boolean>>({});

  const handleImgError = (id: string) => {
    setImgErrors((prev) => ({ ...prev, [id]: true }));
  };

  const getDayLabelForActId = (actId: string): string => {
    const datePart = actId.substring(0, 10);
    const day = days.find(d => d.id === datePart);
    if (day) {
      // Return a short version of the day label, e.g. "Viernes 3"
      return day.dayLabel;
    }
    return '';
  };

  if (acts.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          padding: '40px 20px',
          textAlign: 'center',
          gap: '12px',
        }}
      >
        <Clock size={48} strokeWidth={1.5} />
        <span style={{ fontSize: '1.1rem', fontWeight: '600' }}>No hay actuaciones que coincidan con los filtros</span>
      </div>
    );
  }

  // Group acts by start hour (same day acts are grouped)
  const hourBlocks: Record<string, Act[]> = {};
  acts.forEach((act) => {
    const startHour = act.start.split(':')[0];
    const groupKey = `${startHour}:00`;
    if (!hourBlocks[groupKey]) {
      hourBlocks[groupKey] = [];
    }
    hourBlocks[groupKey].push(act);
  });

  // Sort hour keys chronologically
  const sortedHourKeys = Object.keys(hourBlocks).sort((a, b) => {
    const aHour = parseInt(a.split(':')[0]);
    const bHour = parseInt(b.split(':')[0]);
    const adjA = aHour < dayStartHour ? aHour + 24 : aHour;
    const adjB = bHour < dayStartHour ? bHour + 24 : bHour;
    return adjA - adjB;
  });

  return (
    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        width: '100%',
      }}
      className="animate-fade-in"
    >
      <div className="responsive-content" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
        {sortedHourKeys.map((hourKey) => {
          const hourActs = hourBlocks[hourKey].sort((a, b) => a.startMinutes - b.startMinutes);

          return (
            <div key={hourKey} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Hour Block Header */}
              <div
                style={{
                  fontSize: '1.1rem',
                  fontWeight: '900',
                  color: 'var(--accent-red)',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                  paddingBottom: '4px',
                  marginTop: '4px',
                  letterSpacing: '1px',
                  fontFamily: 'var(--font-display)',
                }}
              >
                {hourKey}
              </div>

              {/* Acts inside this hour block */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {hourActs.map((act) => {
                  const isFavorite = favorites.includes(act.id);
                  const hasConflict = isFavorite && conflictActIds.has(act.id);
                  const isPlayingNow = shouldShowLive && currentTimeMinutes >= act.startMinutes && currentTimeMinutes < act.endMinutes;
                  const minToStart = act.startMinutes - currentTimeMinutes;
                  const showCountdown = isFavorite && shouldShowLive && minToStart > 0 && minToStart <= 120;

                  const stageObj = editionStages.find(s => s.name === act.stage);
                  const stageColor = stageObj ? stageObj.color : '#ffffff';
                  const glassStyle = getStageGlassStyle(stageColor, isPlayingNow, isFavorite);

                  return (
                    <div
                      key={act.id}
                      id={isPlayingNow ? "act-playing-now" : undefined}
                      onClick={() => onSelectAct(act)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '14px 16px',
                        borderRadius: '16px',
                        cursor: 'pointer',
                        color: '#ffffff',
                        transition: 'transform 0.15s, filter 0.15s, box-shadow 0.15s',
                        ...glassStyle,
                      }}
                      className="btn-interactive"
                      onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.15)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.filter = 'none'; }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', flex: 1, marginRight: '12px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: '46px',
                            height: '46px',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            background: 'rgba(0, 0, 0, 0.25)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: '12px',
                            flexShrink: 0,
                            position: 'relative',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                          }}
                        >
                          {!imgErrors[act.id] ? (
                            <img
                              src={`./images/${act.band.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9\s-]/g, "").trim().replace(/[\s-]+/g, " ")}.jpg`}
                              alt=""
                              onError={() => handleImgError(act.id)}
                              loading="lazy"
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                              }}
                            />
                          ) : (
                            <span style={{ fontSize: '0.85rem', fontWeight: '800', color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-display)' }}>
                              {act.band.substring(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, overflow: 'hidden' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '1.15rem', fontWeight: '800', color: '#ffffff', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                              {act.band}
                            </span>
                            
                            {/* Live Mode Badge */}
                            {isPlayingNow && (
                              <span className="pulse-badge">
                                ● DIRECTO
                              </span>
                            )}

                            {/* Conflict Alert Warning Badge */}
                            {hasConflict && (
                              <span
                                className="conflict-warning"
                                style={{
                                  padding: '2px 6px',
                                  fontSize: '0.7rem',
                                  color: '#0d0f14',
                                  borderRadius: '4px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  textTransform: 'uppercase'
                                }}
                                title="Coincide en horario con otra banda favorita"
                                onClick={(e) => e.stopPropagation()}
                              >
                                ⚠️ Solape
                              </span>
                            )}

                            {/* Day badge for global search results */}
                            {showGlobalDayBadge && (
                              <span
                                style={{
                                  fontSize: '0.72rem',
                                  background: 'rgba(0, 0, 0, 0.3)',
                                  color: '#ffffff',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  fontWeight: '700',
                                }}
                              >
                                {getDayLabelForActId(act.id)}
                              </span>
                            )}
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.9)', textShadow: '0 1px 2px rgba(0,0,0,0.3)', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: '700' }}>
                              {act.start} - {act.end}
                            </span>

                            {/* Countdown Badge */}
                            {showCountdown && (
                              <span
                                style={{
                                  color: '#ffd600',
                                  fontWeight: '800',
                                  background: 'rgba(0, 0, 0, 0.35)',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  fontSize: '0.75rem',
                                }}
                              >
                                En {minToStart} min
                              </span>
                            )}

                            <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: 'rgba(255, 255, 255, 0.75)' }}>
                              <MapPin size={12} />
                              {act.stage}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={(e) => onToggleFavorite(act.id, e)}
                        aria-label={isFavorite ? "Quitar de favoritos" : "Añadir a favoritos"}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: isFavorite ? '#ffd600' : 'rgba(255, 255, 255, 0.7)',
                          cursor: 'pointer',
                          padding: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'transform 0.1s, color 0.2s',
                        }}
                        onMouseDown={(e) => { e.stopPropagation(); e.currentTarget.style.transform = 'scale(0.85)'; }}
                        onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                      >
                        <Zap
                          size={20}
                          fill={isFavorite ? '#ffd600' : 'none'}
                          stroke={isFavorite ? '#ffd600' : '#ffffff'}
                          strokeWidth={2.2}
                          style={{
                            filter: isFavorite ? 'drop-shadow(0 0 6px rgba(255, 255, 255, 0.8))' : 'none',
                          }}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
