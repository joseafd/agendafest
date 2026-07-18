import React, { useState, useEffect } from 'react';
import { X, Clock, Calendar, MapPin, Globe, Music, PenTool } from 'lucide-react';

// Standard Feather-equivalent SVGs for social media icons
const InstagramIcon = ({ size = 20 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
  </svg>
);

const FacebookIcon = ({ size = 20 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
  </svg>
);

const YoutubeIcon = ({ size = 20 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 11.54a29 29 0 0 0 .46 5.12 2.78 2.78 0 0 0 1.95 1.96C5.12 19 12 19 12 19s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 11.54a29 29 0 0 0-.46-5.12z"></path>
    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon>
  </svg>
);

const TikTokIcon = ({ size = 20 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
    <path d="M16.6 5.82a4.85 4.85 0 0 1-1.12-3.18h-3.29v13.19a2.77 2.77 0 1 1-2.39-2.75V9.75a6.07 6.07 0 1 0 5.68 6.05V9.11a8.1 8.1 0 0 0 4.72 1.51V7.34a4.89 4.89 0 0 1-3.6-1.52z" />
  </svg>
);

const XIcon = ({ size = 20 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
    <path d="M18.24 2H21l-6.04 6.9L22.06 22h-5.57l-4.36-5.7L7.15 22H4.38l6.46-7.38L4.03 2H9.74l3.94 5.21L18.24 2zm-.97 17.7h1.53L8.91 4.18H7.27L17.27 19.7z" />
  </svg>
);

const isExternalUrl = (value?: string): value is string => /^https?:\/\//i.test(value?.trim() || '');

// Convert band name to standardized uppercase filename
const getBandImageName = (name: string): string => {
  return name
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9\s-]/g, "")
    .trim()
    .replace(/[\s-]+/g, " ");
};
import type { Act, FestivalDay, StageConfig } from '../data/festivalData';
import { getArtistSocialLinks } from '../data/artistSocialLinks';
import { t } from '../utils/translations';
import type { Language } from '../utils/translations';

function getYoutubeEmbedUrl(url: string): string | null {
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
  onLocateStage?: (stage: string) => void;
  days: FestivalDay[];
  editionStages: StageConfig[];
  language: Language;
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
  days,
  editionStages,
  language,
}) => {
  const imageName = act ? getBandImageName(act.band) : '';

  const [imgError, setImgError] = useState<boolean>(false);
  const [currentImageUrl, setCurrentImageUrl] = useState<string>('');

  // Reset image error status and determine primary image source
  useEffect(() => {
    setImgError(false);
    if (act?.bio?.imageUrl) {
      setCurrentImageUrl(act.bio.imageUrl);
    } else if (act) {
      setCurrentImageUrl(`./images/${imageName}.jpg`);
    }
  }, [act, imageName]);

  const handleImageError = () => {
    if (act?.bio?.imageUrl && currentImageUrl === act.bio.imageUrl && imageName) {
      // Fallback to local image if Spotify image fails
      setCurrentImageUrl(`./images/${imageName}.jpg`);
    } else {
      // Both failed, show initials placeholder
      setImgError(true);
    }
  };

  // Find other favorited acts that overlap with this one
  const conflictingActs = React.useMemo(() => {
    if (!act || !isFavorite || !conflictActIds || !favorites) return [];
    
    const dayId = act.id.substring(0, 10);
    const day = days.find(d => d.id === dayId);
    if (!day) return [];

    return day.acts.filter(a => {
      if (a.id === act.id) return false;
      if (!favorites.includes(a.id)) return false;
      
      const startOverlap = Math.max(act.startMinutes, a.startMinutes);
      const endOverlap = Math.min(act.endMinutes, a.endMinutes);
      return startOverlap < endOverlap;
    });
  }, [act, isFavorite, conflictActIds, favorites, days]);

  if (!isOpen || !act) return null;

  const socialLinks = getArtistSocialLinks(act.band);

  const stageObj = editionStages.find(s => s.name === act.stage);
  const stageColor = stageObj ? stageObj.color : '#ffffff';

  // Convert "Iron Maiden" to "IM" for the fallback gradient placeholder
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .slice(0, 2)
      .map((word) => word[0])
      .join('')
      .toUpperCase();
  };



  // Helper to format localized day label
  const getLocalizedDayDescription = (id: string, lang: Language): string => {
    const datePart = id.substring(0, 10);
    const day = days.find(d => d.id === datePart);
    if (!day) return '';
    
    const [, month, date] = datePart.split('-').map(Number);
    
    const monthsMap: Record<number, Record<Language, string>> = {
      1: { es: 'Enero', en: 'January', fr: 'Janvier' },
      2: { es: 'Febrero', en: 'February', fr: 'Février' },
      3: { es: 'Marzo', en: 'March', fr: 'Mars' },
      4: { es: 'Abril', en: 'April', fr: 'Avril' },
      5: { es: 'Mayo', en: 'May', fr: 'Mai' },
      6: { es: 'Junio', en: 'June', fr: 'Juin' },
      7: { es: 'Julio', en: 'July', fr: 'Juillet' },
      8: { es: 'Agosto', en: 'August', fr: 'Août' },
      9: { es: 'Septiembre', en: 'September', fr: 'Septembre' },
      10: { es: 'Octubre', en: 'October', fr: 'Octobre' },
      11: { es: 'Noviembre', en: 'November', fr: 'Novembre' },
      12: { es: 'Diciembre', en: 'December', fr: 'Décembre' },
    };
    
    const weekdayTranslations: Record<string, Record<Language, string>> = {
      'miercoles': { es: 'Miércoles', en: 'Wednesday', fr: 'Mercredi' },
      'jueves': { es: 'Jueves', en: 'Thursday', fr: 'Jeudi' },
      'viernes': { es: 'Viernes', en: 'Friday', fr: 'Vendredi' },
      'sabado': { es: 'Sábado', en: 'Saturday', fr: 'Samedi' },
      'domingo': { es: 'Domingo', en: 'Sunday', fr: 'Dimanche' },
      'miércoles': { es: 'Miércoles', en: 'Wednesday', fr: 'Mercredi' },
      'sábado': { es: 'Sábado', en: 'Saturday', fr: 'Samedi' },
    };

    const wKey = day.weekdayEs.toLowerCase();
    const localizedWeekday = weekdayTranslations[wKey]?.[lang] || day.weekdayEs;
    const localizedMonth = monthsMap[month]?.[lang] || monthsMap[month]?.['es'] || '';

    if (lang === 'en') {
      return `${localizedWeekday}, ${localizedMonth} ${date}`;
    }
    const prep = t(lang, 'de');
    return `${localizedWeekday} ${date} ${prep} ${localizedMonth}`;
  };

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
        onClick={(e) => e.stopPropagation()}
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
          {/* Background Band Image */}
          {!imgError ? (
            <img
              src={currentImageUrl}
              alt={act.band}
              onError={handleImageError}
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

          {/* Dark overlay */}
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

          {/* Close button */}
          <button
            onClick={onClose}
            aria-label={language === 'en' ? "Close details" : language === 'fr' ? "Fermer les détails" : "Cerrar detalles"}
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

          {/* Title overlay */}
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
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '600' }}>{t(language, 'dayLabel')}</div>
                <div style={{ fontWeight: '800', color: '#fff', fontSize: '0.85rem' }}>{getLocalizedDayDescription(act.id, language)}</div>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.90rem', color: 'var(--text-secondary)' }}>
              <Clock size={16} color="var(--accent-red)" />
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '600' }}>{t(language, 'timeLabel')}</div>
                <div style={{ fontWeight: '800', color: '#fff', fontSize: '0.85rem' }}>
                  {act.start} - {act.end} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>({act.duration}m)</span>
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
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '600' }}>{t(language, 'stageLabel')}</div>
                  <div style={{ fontWeight: '800', color: stageColor, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {language === 'en' ? `${act.stage} Stage` : language === 'fr' ? `Scène ${act.stage}` : `Escenario ${act.stage}`}
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
                  {language === 'en' ? '📍 Locate' : language === 'fr' ? '📍 Situer' : '📍 Ubicar'}
                </button>
              )}
            </div>
          </div>

          {/* Social Links Row */}
          {(act.bio?.spotifyUrl || act.bio?.instagramUrl || act.bio?.facebookUrl || act.bio?.youtubeUrl ||
            isExternalUrl(socialLinks.officialWebsite) || isExternalUrl(socialLinks.tiktokUrl) || isExternalUrl(socialLinks.xUrl)) && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                background: 'rgba(255,255,255,0.02)',
                padding: '12px',
                borderRadius: '14px',
                border: '1px solid var(--border-color)',
                marginTop: '-4px',
              }}
            >
              {act.bio?.spotifyUrl && (
                <a
                  href={act.bio?.spotifyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-interactive"
                  title="Spotify"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: 'rgba(29, 185, 84, 0.1)',
                    border: '1px solid rgba(29, 185, 84, 0.4)',
                    color: '#1db954',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#1db954';
                    e.currentTarget.style.color = '#ffffff';
                    e.currentTarget.style.boxShadow = '0 0 10px rgba(29, 185, 84, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(29, 185, 84, 0.1)';
                    e.currentTarget.style.color = '#1db954';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424c-.18.295-.563.387-.857.207-2.377-1.454-5.37-1.783-8.892-.982-.336.076-.67-.135-.746-.47-.077-.337.135-.67.47-.747 3.847-.876 7.143-.5 9.818 1.137.294.18.386.563.207.855zm1.223-2.723c-.226.367-.707.487-1.074.26-2.72-1.672-6.87-2.157-10.08-1.182-.413.125-.847-.107-.972-.52-.125-.413.107-.847.52-.972 3.676-1.115 8.243-.57 11.346 1.334.367.227.487.707.26 1.08zm.106-2.833C14.384 8.71 8.563 8.52 5.176 9.547c-.528.16-1.083-.14-1.243-.67-.16-.527.14-1.082.67-1.243 3.882-1.178 10.315-.956 14.39 1.462.476.282.63.896.347 1.372-.283.475-.897.63-1.373.348z"/>
                  </svg>
                </a>
              )}

              {act.bio?.instagramUrl && (
                <a
                  href={act.bio?.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-interactive"
                  title="Instagram"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: 'rgba(225, 48, 108, 0.1)',
                    border: '1px solid rgba(225, 48, 108, 0.4)',
                    color: '#e1306c',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)';
                    e.currentTarget.style.color = '#ffffff';
                    e.currentTarget.style.boxShadow = '0 0 10px rgba(225, 48, 108, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(225, 48, 108, 0.1)';
                    e.currentTarget.style.color = '#e1306c';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <InstagramIcon size={20} />
                </a>
              )}

              {act.bio?.facebookUrl && (
                <a
                  href={act.bio?.facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-interactive"
                  title="Facebook"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: 'rgba(24, 119, 242, 0.1)',
                    border: '1px solid rgba(24, 119, 242, 0.4)',
                    color: '#1877f2',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#1877f2';
                    e.currentTarget.style.color = '#ffffff';
                    e.currentTarget.style.boxShadow = '0 0 10px rgba(24, 119, 242, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(24, 119, 242, 0.1)';
                    e.currentTarget.style.color = '#1877f2';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <FacebookIcon size={20} />
                </a>
              )}

              {act.bio?.youtubeUrl && (
                <a
                  href={act.bio?.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-interactive"
                  title="YouTube"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: 'rgba(255, 0, 0, 0.1)',
                    border: '1px solid rgba(255, 0, 0, 0.4)',
                    color: '#ff0000',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#ff0000';
                    e.currentTarget.style.color = '#ffffff';
                    e.currentTarget.style.boxShadow = '0 0 10px rgba(255, 0, 0, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 0, 0, 0.1)';
                    e.currentTarget.style.color = '#ff0000';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <YoutubeIcon size={20} />
                </a>
              )}

              {isExternalUrl(socialLinks.officialWebsite) && (
                <a
                  href={socialLinks.officialWebsite}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-interactive"
                  title="Web oficial"
                  aria-label={`Web oficial de ${act.band}`}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: '40px', height: '40px', borderRadius: '50%',
                    background: 'rgba(148, 163, 184, 0.1)',
                    border: '1px solid rgba(148, 163, 184, 0.45)',
                    color: '#cbd5e1', transition: 'all 0.2s',
                  }}
                >
                  <Globe size={20} />
                </a>
              )}

              {isExternalUrl(socialLinks.tiktokUrl) && (
                <a
                  href={socialLinks.tiktokUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-interactive"
                  title="TikTok"
                  aria-label={`TikTok de ${act.band}`}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: '40px', height: '40px', borderRadius: '50%',
                    background: 'rgba(37, 244, 238, 0.08)',
                    border: '1px solid rgba(254, 44, 85, 0.45)',
                    color: '#25f4ee', transition: 'all 0.2s',
                  }}
                >
                  <TikTokIcon size={20} />
                </a>
              )}

              {isExternalUrl(socialLinks.xUrl) && (
                <a
                  href={socialLinks.xUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-interactive"
                  title="X"
                  aria-label={`X de ${act.band}`}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: '40px', height: '40px', borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.35)',
                    color: '#ffffff', transition: 'all 0.2s',
                  }}
                >
                  <XIcon size={19} />
                </a>
              )}
            </div>
          )}

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
                  {language === 'en' ? '✍️ Official Signing Session' : language === 'fr' ? '✍️ Séance de Dédicaces' : '✍️ Pase de Firmas Oficial'}
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
              padding: '14px',
              fontSize: '1.05rem',
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
            <img 
              src="./images/favicon.png" 
              alt="" 
              style={{ 
                width: '18px', 
                height: '18px', 
                objectFit: 'contain',
                filter: isFavorite ? 'none' : 'grayscale(100%) opacity(0.5) brightness(2)' 
              }} 
            />
            {isFavorite ? t(language, 'removeFavorites') : t(language, 'addFavorites')}
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
                  {t(language, 'conflictTitle')}
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)', lineHeight: 1.35 }}>
                  {t(language, 'conflictDesc')}{' '}
                  {conflictingActs.map((c, idx) => (
                    <span key={c.id}>
                      <strong>{c.band}</strong> ({c.start} - {c.end} {language === 'en' ? 'on' : language === 'fr' ? 'sur' : 'en'} {c.stage})
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
              {language === 'en' ? 'Band Information' : language === 'fr' ? 'Informations sur le groupe' : 'Información de la Banda'}
            </h3>

            {/* Country and Genre sub-row */}
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
                      <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)', fontWeight: '600' }}>{t(language, 'countryLabel')}</div>
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
                      <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '2px' }}>{t(language, 'genreLabel')}</div>
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
                {language === 'en' ? 'Information not available.' : language === 'fr' ? 'Informations non disponibles.' : 'Información no disponible.'}
              </p>
            )}
          </div>

          {/* Youtube Video Embed */}
          {act.bio?.youtubeUrl && (
            <div>
              <h3 style={{ fontSize: '0.88rem', color: 'var(--text-muted)', fontWeight: '800', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '10px' }}>
                {language === 'en' ? 'Featured Video' : language === 'fr' ? 'Vidéo Vedette' : 'Vídeo Destacado'}
              </h3>
              {(() => {
                const embedUrl = getYoutubeEmbedUrl(act.bio.youtubeUrl);
                if (!embedUrl) return null;
                return (
                  <div
                    style={{
                      position: 'relative',
                      width: '100%',
                      paddingBottom: '56.25%',
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
