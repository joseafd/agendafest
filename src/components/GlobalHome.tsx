import React, { useState, useRef, useMemo } from 'react';
import { HomeHeader } from './HomeHeader';
import { GlobalSearchBar } from './GlobalSearchBar';
import { MyFestivalsSection } from './MyFestivalsSection';
import { ContinueAgendaSection } from './ContinueAgendaSection';
import { UpcomingFestivalsSection } from './UpcomingFestivalsSection';
import { FestivalCard } from './FestivalCard';
import { PwaInstallModal } from './PwaInstallModal';
import { NewsView } from './NewsView';
import { t } from '../utils/translations';
import type { Language } from '../utils/translations';
import type { FestivalEdition } from '../data/festivalData';
import { FinishedFestivalsSection } from './FinishedFestivalsSection';
import { X, Calendar, Map, Newspaper, Info } from 'lucide-react';

interface GlobalHomeProps {
  editions: FestivalEdition[];
  onSelectEdition: (id: string) => void;
  language: Language;
  onChangeLanguage: (lang: Language) => void;
}

export const GlobalHome: React.FC<GlobalHomeProps> = ({
  editions,
  onSelectEdition,
  language,
  onChangeLanguage,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isPwaOpen, setIsPwaOpen] = useState(false);
  const [isCreditsOpen, setIsCreditsOpen] = useState(false);
  const [isNewsOpen, setIsNewsOpen] = useState(false);
  const [activeSelectorModal, setActiveSelectorModal] = useState<'agenda' | 'map' | 'news' | 'finished' | 'myFestivals' | 'allSystem' | null>(null);

  const allGlobalNews = useMemo(() => {
    const parseDDMMYYYY = (dateStr: string): Date => {
      const [d, m, y] = dateStr.split('/').map(Number);
      return new Date(y, m - 1, d);
    };

    const newsList: any[] = [];
    editions.forEach((ed) => {
      if (ed.noticias && Array.isArray(ed.noticias)) {
        ed.noticias.forEach((item) => {
          newsList.push(item);
        });
      }
    });

    return newsList
      .sort((a, b) => parseDDMMYYYY(b.fecha).getTime() - parseDDMMYYYY(a.fecha).getTime())
      .slice(0, 5);
  }, [editions]);

  // Load followed editions from localStorage
  const [followedEditions, setFollowedEditions] = useState<string[]>(() => {
    try {
      const stored = window.localStorage.getItem('af_followed_editions');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  });

  const todayStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);

  const finishedEditions = useMemo(() => {
    return editions
      .filter(ed => ed.config.endDate < todayStr)
      .sort((a, b) => b.config.endDate.localeCompare(a.config.endDate));
  }, [editions, todayStr]);

  const allMyEditions = useMemo(() => {
    return editions.filter((ed) => {
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
      return isFollowed || hasFavs;
    }).sort((a, b) => a.config.startDate.localeCompare(b.config.startDate));
  }, [editions, followedEditions]);

  const allSystemEditions = useMemo(() => {
    return [...editions].sort((a, b) => a.config.startDate.localeCompare(b.config.startDate));
  }, [editions]);

  const handleToggleFollow = (edId: string) => {
    setFollowedEditions((prev) => {
      const updated = prev.includes(edId) ? prev.filter(id => id !== edId) : [...prev, edId];
      try {
        window.localStorage.setItem('af_followed_editions', JSON.stringify(updated));
      } catch (e) {
        // ignore
      }
      return updated;
    });
  };

  const searchRef = useRef<HTMLInputElement>(null);

  // Focus global search bar
  const handleFocusSearch = () => {
    if (searchRef.current) {
      searchRef.current.focus();
      // Scroll to search input
      searchRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Scroll to a specific section by element ID
  const handleScrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Search logic: searches name, location, or acts (bands)
  const filteredEditions = useMemo(() => {
    if (searchQuery.trim() === '') return editions;
    const query = searchQuery.toLowerCase().trim();

    return editions.filter((ed) => {
      const nameMatch = ed.config.festivalName.toLowerCase().includes(query) || ed.config.visibleName.toLowerCase().includes(query);
      const locationMatch = ed.config.location.toLowerCase().includes(query);
      const bandMatch = ed.days.some(day => day.acts.some(act => act.band.toLowerCase().includes(query)));
      return nameMatch || locationMatch || bandMatch;
    });
  }, [editions, searchQuery]);


  // Filter editions that have saved favorites
  const editionsWithFavs = useMemo(() => {
    return editions.filter((ed) => {
      try {
        const favsStr = window.localStorage.getItem(`af_${ed.config.edicionId}_favorites`);
        if (favsStr) {
          const favs = JSON.parse(favsStr);
          return Array.isArray(favs) && favs.length > 0;
        }
      } catch (e) {
        // ignore
      }
      return false;
    });
  }, [editions]);

  // Handle Quick Access - Mi Agenda click
  const handleOpenAgenda = () => {
    if (editionsWithFavs.length === 1) {
      const edId = editionsWithFavs[0].config.edicionId;
      window.localStorage.setItem(`af_${edId}_open_agenda_favs`, 'true');
      window.localStorage.setItem(`af_${edId}_only_favorites`, 'true');
      onSelectEdition(edId);
    } else if (editionsWithFavs.length > 1) {
      setActiveSelectorModal('agenda');
    } else {
      // No agendas created: scroll to selectors to choose a festival
      handleScrollToSection('my-festivals-section');
    }
  };


  // Handle Quick Access - Noticias click
  const handleOpenNews = () => {
    setIsNewsOpen(true);
  };

  const handleSelectEditionFromModal = (edId: string) => {
    const action = activeSelectorModal;
    setActiveSelectorModal(null);

    if (action === 'agenda') {
      window.localStorage.setItem(`af_${edId}_open_agenda_favs`, 'true');
      window.localStorage.setItem(`af_${edId}_only_favorites`, 'true');
    } else if (action === 'map') {
      window.localStorage.setItem(`af_${edId}_open_map`, 'true');
    } else if (action === 'news') {
      window.localStorage.setItem(`af_${edId}_open_news`, 'true');
    }

    onSelectEdition(edId);
  };

  const hasSearchQuery = searchQuery.trim() !== '';

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: 'var(--bg-primary)',
        overflowY: 'auto',
        padding: '24px 16px',
        paddingTop: 'calc(24px + var(--safe-top))',
        paddingBottom: 'calc(40px + var(--safe-bottom))',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
      className="animate-fade-in"
    >
      <div className="responsive-content" style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* 1. Cabecera principal */}
        <HomeHeader
          language={language}
          onChangeLanguage={onChangeLanguage}
          onOpenPwaGuide={() => setIsPwaOpen(true)}
          onScrollToSection={handleScrollToSection}
          onFocusSearch={handleFocusSearch}
          onOpenQuickAgenda={handleOpenAgenda}
          onOpenLastNews={handleOpenNews}
          onOpenCredits={() => setIsCreditsOpen(true)}
        />

        {/* 2. Buscador principal */}
        <GlobalSearchBar
          inputRef={searchRef}
          value={searchQuery}
          onChange={setSearchQuery}
          language={language}
        />

        {hasSearchQuery ? (
          /* Search Results display list */
          <div style={{ width: '100%', minHeight: '200px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--text-secondary)', margin: 0, textTransform: 'uppercase' }}>
                {language === 'es' ? 'Resultados de búsqueda' : language === 'en' ? 'Search Results' : 'Résultats de recherche'}
              </h3>
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-secondary)',
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  padding: '4px 10px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                {language === 'es' ? 'Limpiar' : language === 'en' ? 'Clear' : 'Effacer'}
              </button>
            </div>

            {filteredEditions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                {t(language, 'noResultsFound')}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                {filteredEditions.map((ed) => (
                  <FestivalCard
                    key={ed.config.edicionId}
                    edition={ed}
                    language={language}
                    onClick={() => onSelectEdition(ed.config.edicionId)}
                    isFollowed={followedEditions.includes(ed.config.edicionId)}
                    onToggleFollow={() => handleToggleFollow(ed.config.edicionId)}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Standard Global PWA blocks in order */
          <>
            {/* 3. Mis festivales */}
            <MyFestivalsSection
              editions={editions}
              language={language}
              onSelectEdition={onSelectEdition}
              onScrollToUpcoming={() => handleScrollToSection('upcoming-festivals-section')}
              onShowAll={() => setActiveSelectorModal('myFestivals')}
              followedEditions={followedEditions}
              onToggleFollow={handleToggleFollow}
            />

            {/* 4. Continuar mi agenda (sólo se muestra si hay agendas con favoritos) */}
            {editionsWithFavs.length > 0 && (
              <ContinueAgendaSection
                editions={editions}
                language={language}
                onSelectEdition={onSelectEdition}
                onScrollToMyFestivals={() => handleScrollToSection('my-festivals-section')}
              />
            )}

            {/* 5. Próximos festivales */}
            <UpcomingFestivalsSection
              editions={editions}
              language={language}
              onSelectEdition={onSelectEdition}
              onShowAll={() => setActiveSelectorModal('allSystem')}
              followedEditions={followedEditions}
              onToggleFollow={handleToggleFollow}
            />

            {/* 5.5 Festivales finalizados */}
            <FinishedFestivalsSection
              editions={editions}
              language={language}
              onSelectEdition={onSelectEdition}
              followedEditions={followedEditions}
              onToggleFollow={handleToggleFollow}
              onOpenAllFinishedModal={() => setActiveSelectorModal('finished')}
            />

          </>
        )}
      </div>

      {/* PWA Install Modal Guide */}
      <PwaInstallModal
        isOpen={isPwaOpen}
        onClose={() => setIsPwaOpen(false)}
        festivalName="AgendaFest"
        language={language}
      />

      {/* Selector Modal (when multiple editions have favs or when selecting map/news without last opened) */}
      {activeSelectorModal && (
        <div
          onClick={() => setActiveSelectorModal(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(10, 11, 16, 0.85)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            animation: 'fadeIn 0.25s ease-out',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '360px',
              background: '#0d0f14',
              border: '1px solid var(--border-color)',
              borderRadius: '20px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ fontSize: '1.05rem', fontWeight: '900', color: '#ffffff', margin: 0 }}>
                {activeSelectorModal === 'agenda'
                  ? (language === 'es' ? 'Selecciona una agenda' : language === 'en' ? 'Select a schedule' : 'Sélectionner un agenda')
                  : activeSelectorModal === 'map'
                  ? (language === 'es' ? 'Selecciona un mapa' : language === 'en' ? 'Select a map' : 'Sélectionner un plan')
                  : activeSelectorModal === 'finished'
                  ? (language === 'es' ? 'Festivales finalizados' : language === 'en' ? 'Past Festivals' : 'Festivals terminés')
                  : activeSelectorModal === 'myFestivals'
                  ? (language === 'es' ? 'Mis festivales favoritos' : language === 'en' ? 'My Favorite Festivals' : 'Mes festivals favoris')
                  : activeSelectorModal === 'allSystem'
                  ? (language === 'es' ? 'Todos los festivales' : language === 'en' ? 'All Festivals' : 'Tous les festivals')
                  : (language === 'es' ? 'Selecciona un festival' : language === 'en' ? 'Select a festival' : 'Sélectionner un festival')
                }
              </h4>
              <button
                onClick={() => setActiveSelectorModal(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Show matching editions */}
              {(() => {
                let list = editions;
                if (activeSelectorModal === 'agenda') {
                  list = editionsWithFavs;
                } else if (activeSelectorModal === 'finished') {
                  list = finishedEditions;
                } else if (activeSelectorModal === 'myFestivals') {
                  list = allMyEditions;
                } else if (activeSelectorModal === 'allSystem') {
                  list = allSystemEditions;
                }
                return list.map((ed) => (
                  <button
                    key={ed.config.edicionId}
                    onClick={() => handleSelectEditionFromModal(ed.config.edicionId)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      border: '1px solid var(--border-color)',
                      background: 'rgba(255,255,255,0.02)',
                      color: '#ffffff',
                      fontSize: '0.92rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                    }}
                    className="btn-interactive"
                  >
                    {activeSelectorModal === 'agenda' || activeSelectorModal === 'myFestivals' ? (
                      <Calendar size={16} color="#ff2a85" />
                    ) : activeSelectorModal === 'map' ? (
                      <Map size={16} color="#e67e22" />
                    ) : activeSelectorModal === 'finished' ? (
                      <Calendar size={16} color="#94a3b8" />
                    ) : (
                      <Newspaper size={16} color="#2b8be3" />
                    )}
                    <span>{ed.config.visibleName}</span>
                  </button>
                ));
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Credits Modal (Neomorphic Glass Popup) */}
      {isCreditsOpen && (
        <div
          onClick={() => setIsCreditsOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(10, 11, 16, 0.85)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            animation: 'fadeIn 0.25s ease-out',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '360px',
              background: '#0d0f14',
              border: '1px solid var(--border-color)',
              borderRadius: '20px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Info size={18} color="#2b8be3" />
                <h4 style={{ fontSize: '1.1rem', fontWeight: '900', color: '#ffffff', margin: 0 }}>
                  {language === 'es' ? 'Créditos y Autoría' : language === 'en' ? 'Credits & Authorship' : 'Crédits & Auteurs'}
                </h4>
              </div>
              <button
                onClick={() => setIsCreditsOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
              {language === 'es'
                ? 'AgendaFest es una aplicación web no oficial diseñada para facilitar la consulta de horarios y organización de agendas de conciertos en festivales.'
                : 'AgendaFest is an unofficial web application designed to help search schedules and organize concert agendas during music festivals.'}
            </p>

            <div
              style={{
                fontSize: '0.78rem',
                color: 'var(--text-muted)',
                background: 'rgba(255, 255, 255, 0.01)',
                border: '1px solid var(--border-color)',
                padding: '10px 12px',
                borderRadius: '8px',
              }}
            >
              <strong>Desarrollado por:</strong> Joseafd<br />
              <strong>Versión:</strong> 1.5.0<br />
              <strong>Diseño:</strong> Neomorphic Glass UI
            </div>
          </div>
        </div>
      )}

      {isNewsOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999999 }}>
          <NewsView
            noticias={allGlobalNews}
            onBackToHome={() => setIsNewsOpen(false)}
            festivalName=""
            language={language}
          />
        </div>
      )}
    </div>
  );
};
