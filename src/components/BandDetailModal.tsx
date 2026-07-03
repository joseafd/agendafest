import React, { useState, useEffect } from 'react';
import { X, Zap, Clock, Calendar, MapPin, Globe, Music, PenTool } from 'lucide-react';
import type { Act } from '../data/festivalData';

import { festivalData } from '../data/festivalData';

export function getYoutubeEmbedUrl(url: string): string | null {
  if (!url) return null;
  let videoId = '';
  const watchMatch = url.match(/[?&]v=([^&#]+)/);
  if (watchMatch) {
    videoId = watchMatch[1];
  } else {
    const shortMatch = url.match(/youtu\.be\/([^&#?/]+)/);
    if (shortMatch) {
      videoId = shortMatch[1];
    } else {
      const embedMatch = url.match(/embed\/([^&#?/]+)/);
      if (embedMatch) {
        videoId = embedMatch[1];
      }
    }
  }
  return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
}

interface BandDetailModalProps {
  act: Act | null;
  isOpen: boolean;
  onClose: () => void;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  conflictActIds?: Set<string>;
  favorites?: string[];
  onLocateStage?: (stage: string) => void; // New optional prop
}

export const BandDetailModal: React.FC<BandDetailModalProps> = ({
  act,
  isOpen,
  onClose,
  isFavorite,
  onToggleFavorite,
  conflictActIds = new Set(),
  favorites = [],
  onLocateStage,
}) => {
  const [imgError, setImgError] = useState<boolean>(false);

  // Reset image error status when another act is clicked
  useEffect(() => {
    setImgError(false);
  }, [act]);

  // Find other favorited acts that overlap with this one
  const conflictingActs = React.useMemo(() => {
    if (!act || !isFavorite || !conflictActIds || !favorites) return [];
    
    const dayId = act.id.substring(0, 10);
    const day = festivalData.days.find(d => d.id === dayId);
    if (!day) return [];

    return day.acts.filter(a => {
      if (a.id === act.id) return false;
      if (!favorites.includes(a.id)) return false;
      
      const startOverlap = Math.max(act.startMinutes, a.startMinutes);
      const endOverlap = Math.min(act.endMinutes, a.endMinutes);
      return startOverlap < endOverlap;
    });
  }, [act, isFavorite, conflictActIds, favorites]);

  if (!isOpen || !act) return null;

  const stageColor = `var(--color-${act.stage.toLowerCase()})`;

  // Convert "Iron Maiden" to "IM" for the fallback gradient placeholder
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .slice(0, 2)
      .map((word) => word[0])
      .join('')
      .toUpperCase();
  };

  // Convert band name to standardized uppercase filename (e.g. "P.O.D." -> "POD.jpg", "A Day To Remember" -> "A DAY TO REMEMBER.jpg")
  const getBandImageName = (name: string): string => {
    return name
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // remove accent diacritics
      .replace(/[^A-Z0-9\s-]/g, "") // remove dots/special characters
      .trim()
      .replace(/[\s-]+/g, " "); // preserve spaces and clean multiple spacing
  };

  // Helper to format Spanish weekday name
  const getDayDescription = (id: string): string => {
    if (id.startsWith('2026-07-01')) return 'Miércoles 1 de Julio';
    if (id.startsWith('2026-07-02')) return 'Jueves 2 de Julio';
    if (id.startsWith('2026-07-03')) return 'Viernes 3 de Julio';
    if (id.startsWith('2026-07-04')) return 'Sábado 4 de Julio';
    return '';
  };

  const imageName = getBandImageName(act.band);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 110,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(6, 7, 10, 0.82)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        padding: '20px',
        animation: 'fadeIn 0.2s ease-out forwards',
      }}
      onClick={onClose}
    >
      {/* Modal Dialog Card */}
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          maxHeight: '85vh',
          background: 'rgba(18, 20, 26, 0.72)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: '24px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.75)',
          animation: 'fadeInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        }}
        onClick={(e) => e.stopPropagation()} // Prevent close on tap inside card
      >
        
        {/* 1. HERO HEADER - FULL BLEED PHOTO */}
        <div
          style={{
            height: '220px',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-end',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            overflow: 'hidden',
            padding: '24px 20px',
          }}
        >
          {/* Background Band Image (Loads if no error) */}
          {!imgError ? (
            <img
              src={`./images/${imageName}.jpg`}
              alt={act.band}
              onError={() => setImgError(true)}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                zIndex: 1,
              }}
            />
          ) : (
            /* Fallback full-bleed gradient with initials */
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background: 'linear-gradient(135deg, #1b1d24 0%, #2c2f3b 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1,
              }}
            >
              <span
                style={{
                  fontSize: '5rem',
                  fontWeight: '900',
                  color: 'rgba(255, 255, 255, 0.03)',
                  fontFamily: 'var(--font-sans)',
                  letterSpacing: '8px',
                  userSelect: 'none',
                }}
              >
                {getInitials(act.band)}
              </span>
            </div>
          )}

          {/* Dark esmerilado gradient overlay for text readability */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '140px',
              background: 'linear-gradient(to top, rgba(10, 11, 16, 0.98) 0%, rgba(10, 11, 16, 0.6) 50%, rgba(10, 11, 16, 0) 100%)',
              zIndex: 2,
            }}
          />

          {/* Close button overlaid on top right */}
          <button
            onClick={onClose}
            aria-label="Cerrar detalles"
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              background: 'rgba(0, 0, 0, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: '#ffffff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
              transition: 'background-color 0.2s',
            }}
            className="btn-interactive"
          >
            <X size={18} />
          </button>

          {/* Content (Title) overlaid over the photo */}
          <div style={{ position: 'relative', zIndex: 5, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h2
              className="neon-text-glow"
              style={{
                fontSize: '1.75rem',
                fontWeight: '800',
                color: '#ffffff',
                textAlign: 'center',
                letterSpacing: '0.5px',
                textShadow: '0 2px 10px rgba(0,0,0,0.85)',
              }}
            >
              {act.band}
            </h2>
          </div>
        </div>

        {/* 2. MODAL BODY */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
          
          {/* Gig details row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '14px',
              background: 'rgba(255,255,255,0.02)',
              padding: '14px',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.90rem', color: 'var(--text-secondary)' }}>
              <Calendar size={16} color="var(--accent-red)" />
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '600' }}>Día</div>
                <div style={{ fontWeight: '800', color: '#fff' }}>{getDayDescription(act.id)}</div>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.90rem', color: 'var(--text-secondary)' }}>
              <Clock size={16} color="var(--accent-red)" />
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '600' }}>Horario</div>
                <div style={{ fontWeight: '800', color: '#fff' }}>
                  {act.start} - {act.end} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>({act.duration}m)</span>
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
                fontSize: '0.90rem',
                color: 'var(--text-secondary)',
                gridColumn: 'span 2',
                marginTop: '4px',
                borderTop: '1px solid rgba(255, 255, 255, 0.04)',
                paddingTop: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <MapPin size={16} color={stageColor} />
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '600' }}>Escenario</div>
                  <div style={{ fontWeight: '800', color: stageColor, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {act.stage} Stage
                  </div>
                </div>
              </div>

              {onLocateStage && (
                <button
                  onClick={() => {
                    onLocateStage(act.stage);
                    onClose();
                  }}
                  style={{
                    background: 'rgba(255, 42, 133, 0.08)',
                    border: '1px solid rgba(255, 42, 133, 0.35)',
                    color: '#ff2a85',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    fontSize: '0.72rem',
                    fontWeight: '800',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}
                  className="btn-interactive"
                >
                  📍 Ubicar
                </button>
              )}
            </div>
          </div>

          {/* Prominent Signing Session Banner */}
          {act.bio?.signingSession && (
            <div
              style={{
                marginTop: '16px',
                padding: '12px 16px',
                background: 'linear-gradient(135deg, rgba(230, 126, 34, 0.15) 0%, rgba(112, 0, 255, 0.08) 100%)',
                border: '1px solid rgba(230, 126, 34, 0.3)',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                boxShadow: '0 4px 15px rgba(230, 126, 34, 0.15)',
              }}
            >
              <div
                style={{
                  background: 'rgba(230, 126, 34, 0.2)',
                  borderRadius: '10px',
                  padding: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(230, 126, 34, 0.3)',
                }}
              >
                <PenTool size={18} color="#e67e22" />
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: '0.68rem',
                    color: '#e67e22',
                    fontWeight: '800',
                    letterSpacing: '1.2px',
                    textTransform: 'uppercase',
                  }}
                >
                  ✍️ Pase de Firmas Oficial
                </div>
                <div
                  style={{
                    fontSize: '0.88rem',
                    color: '#ffffff',
                    fontWeight: '700',
                    marginTop: '2px',
                  }}
                >
                  {act.bio.signingSession.replace(/^SESIONES DE FIRMAS\s*[-–:]\s*/i, '')}
                </div>
              </div>
            </div>
          )}

          {/* Favorite CTA Button */}
          <button
            onClick={() => onToggleFavorite(act.id)}
            style={{
              width: '100%',
              background: isFavorite ? 'rgba(255, 42, 133, 0.08)' : 'var(--gradient-accent)',
              color: '#ffffff',
              border: isFavorite ? '1px solid rgba(255, 42, 133, 0.45)' : 'none',
              borderRadius: '14px',
              padding: '14px', /* Aumentado padding */
              fontSize: '1.05rem', /* Aumentado 2pt */
              fontWeight: '800',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: isFavorite ? 'none' : '0 4px 15px rgba(255, 42, 133, 0.3)',
              transition: 'background 0.2s, border-color 0.2s, transform 0.1s',
            }}
            className="btn-interactive"
            onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.96)'; }}
            onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            <Zap size={18} fill={isFavorite ? '#ffd600' : 'none'} stroke={isFavorite ? '#ffd600' : '#ffffff'} />
            {isFavorite ? 'Quitar de Favoritos' : 'Añadir a Favoritos'}
          </button>

          {/* Timing Conflict Alert */}
          {isFavorite && conflictingActs.length > 0 && (
            <div
              className="glass"
              style={{
                background: 'rgba(255, 214, 0, 0.08)',
                border: '1px solid #ffd600',
                borderRadius: '12px',
                padding: '12px 16px',
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start',
                marginTop: '4px',
                boxShadow: '0 4px 15px rgba(255, 214, 0, 0.1)',
                animation: 'pulseYellow 2.5s infinite ease-in-out',
              }}
            >
              <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>⚠️</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left' }}>
                <span style={{ color: '#ffd600', fontWeight: '900', fontSize: '0.82rem', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                  Conflicto de Horario
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)', lineHeight: 1.35 }}>
                  Coincide en tiempo con tu favorita:{' '}
                  {conflictingActs.map((c, idx) => (
                    <span key={c.id}>
                      <strong>{c.band}</strong> ({c.start} - {c.end} en {c.stage} Stage)
                      {idx < conflictingActs.length - 1 ? ', ' : ''}
                    </span>
                  ))}
                </span>
              </div>
            </div>
          )}

          {/* Description Section */}
          <div>
            <h3 style={{ fontSize: '0.88rem', color: 'var(--text-muted)', fontWeight: '800', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '12px' }}>
              Información de la Banda
            </h3>

            {/* Country and Genre sub-row (same style as details grid) */}
            {(act.bio?.country || act.bio?.genre) && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  marginBottom: '16px',
                }}
              >
                {act.bio.country && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      fontSize: '0.90rem',
                      background: 'rgba(255,255,255,0.02)',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                    }}
                  >
                    <Globe size={15} color="var(--accent-red)" />
                    <div>
                      <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)', fontWeight: '600' }}>País</div>
                      <div style={{ fontWeight: '800', color: '#fff' }}>{act.bio.country}</div>
                    </div>
                  </div>
                )}

                {act.bio.genre && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      fontSize: '0.90rem',
                      background: 'rgba(255,255,255,0.02)',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      overflow: 'hidden',
                    }}
                  >
                    <Music size={15} color="var(--accent-red)" />
                    <div style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                      <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '2px' }}>Género</div>
                      {act.bio.genre.split(',').map((style, idx) => (
                        <div
                          key={idx}
                          style={{
                            fontWeight: '800',
                            color: '#fff',
                            fontSize: '0.82rem',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            lineHeight: '1.25',
                          }}
                          title={style.trim()}
                        >
                          {style.trim()}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {act.bio ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {act.bio.title && (
                  <h4 style={{ fontSize: '0.98rem', fontWeight: '800', color: 'var(--accent-red)', borderLeft: '3px solid var(--accent-red)', paddingLeft: '10px', lineHeight: 1.3 }}>
                    {act.bio.title}
                  </h4>
                )}
                <p style={{ fontSize: '0.95rem', lineHeight: '1.6', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                  {act.bio.description}
                </p>
              </div>
            ) : (
              <p style={{ fontSize: '0.95rem', fontStyle: 'italic', color: 'var(--text-muted)' }}>
                Información no disponible.
              </p>
            )}
          </div>

          {/* Youtube Video Embed */}
          {act.bio?.youtubeUrl && (
            <div>
              <h3 style={{ fontSize: '0.88rem', color: 'var(--text-muted)', fontWeight: '800', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '10px' }}>
                Vídeo Destacado
              </h3>
              {(() => {
                const embedUrl = getYoutubeEmbedUrl(act.bio.youtubeUrl);
                if (!embedUrl) return null;
                return (
                  <div
                    style={{
                      position: 'relative',
                      width: '100%',
                      paddingBottom: '56.25%', /* 16:9 Aspect Ratio */
                      height: 0,
                      borderRadius: '12px',
                      overflow: 'hidden',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                    }}
                  >
                    <iframe
                      src={embedUrl}
                      title={`Video de ${act.band}`}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                      }}
                    />
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
