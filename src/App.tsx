import React, { useState, useMemo, useEffect } from 'react';
import { Header } from './components/Header';
import { SearchBar } from './components/SearchBar';
import { HoursView } from './components/HoursView';
import { StagesView } from './components/StagesView';
import { FilterDrawer } from './components/FilterDrawer';
import { BandDetailModal } from './components/BandDetailModal';
import { festivalData } from './data/festivalData';
import type { Act } from './data/festivalData';
import { useLocalStorage } from './hooks/useLocalStorage';
import { Calendar, Map, ArrowLeft, Info, Share2 } from 'lucide-react';

export default function App() {
  const defaultStages = ["Main", "Ritual", "Chaos", "Desert"];

  // 1. App Navigation State (home, agenda, map, credits)
  const [activeTab, setActiveTab] = useState<'home' | 'agenda' | 'map' | 'credits'>('home');

  // Helper to determine the initial day based on current query date-time and the Jornada schedule
  const getInitialDayId = (): string => {
    const now = new Date();
    
    // Month is 0-indexed: July is index 6
    const j1_end   = new Date(2026, 6, 2, 3, 30, 0); // Thursday 2 July 03:30
    const j2_end   = new Date(2026, 6, 3, 3, 30, 0); // Friday 3 July 03:30
    const j3_end   = new Date(2026, 6, 4, 3, 30, 0); // Saturday 4 July 03:30

    if (now < j1_end) {
      return '2026-07-01'; // Miércoles
    }
    if (now >= j1_end && now < j2_end) {
      return '2026-07-02'; // Jueves
    }
    if (now >= j2_end && now < j3_end) {
      return '2026-07-03'; // Viernes
    }
    // Any time after Friday 03:30 AM defaults to Saturday (Jornada 4)
    return '2026-07-04'; // Sábado
  };

  // 2. Persistent State
  const [selectedDayId, setSelectedDayId] = useState<string>(getInitialDayId());
  const [viewMode, setViewMode] = useLocalStorage<'hours' | 'stages'>('rf_view_mode', 'hours');
  const [favorites, setFavorites] = useLocalStorage<string[]>('rf_favorites', []);
  const [visibleStages, setVisibleStages] = useLocalStorage<string[]>('rf_visible_stages', defaultStages);
  const [stagesOrder, setStagesOrder] = useLocalStorage<string[]>('rf_stages_order', defaultStages);
  const [onlyFavorites, setOnlyFavorites] = useLocalStorage<boolean>('rf_only_favorites', false);

  // 3. UI & Notification State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchGlobal, setSearchGlobal] = useState<boolean>(false);
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
  const [selectedAct, setSelectedAct] = useState<Act | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [pendingImport, setPendingImport] = useState<string[] | null>(null);
  const [visitCount, setVisitCount] = useState<number | null>(null);

  // 4. Days list shortcut
  const days = festivalData.days;
  const currentDay = useMemo(() => {
    return days.find((day) => day.id === selectedDayId) || days[0];
  }, [days, selectedDayId]);

  // 5. URL query string import checker (runs on load)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('favs')) {
      const favsStr = params.get('favs');
      if (favsStr) {
        const sharedIds = favsStr.split(',').filter(id => id.trim() !== '');
        if (sharedIds.length > 0) {
          setPendingImport(sharedIds);
        }
      }
    }
  }, []);

  // 5b. Visitor Counter fetcher (CounterAPI.dev)
  useEffect(() => {
    fetch('https://api.counterapi.dev/v1/joseafd_resurrection_fest_2026/page_views/up')
      .then((res) => res.json())
      .then((data) => {
        if (data && typeof data.count === 'number') {
          setVisitCount(data.count);
        }
      })
      .catch((err) => {
        console.error('Error fetching visitor counter:', err);
      });
  }, []);

  // 6. Current Festival Time Simulator Logic
  // Minute 0 of festival day starts at 14:00 (2:00 PM). Ends at 28:00 (4:00 AM next morning).
  const getFestivalMinutes = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();

    let displayHour = hours;
    if (hours < 4) {
      displayHour = hours + 24; // Treat 01:00 as 25:00
    }

    if (displayHour >= 14 && displayHour < 28) {
      return (displayHour - 14) * 60 + minutes;
    }
    return -1; // Outside active timeline hours
  };

  const [currentFestivalMinutes, setCurrentFestivalMinutes] = useState<number>(getFestivalMinutes());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentFestivalMinutes(getFestivalMinutes());
    }, 30000); // Update every 30 seconds
    return () => clearInterval(timer);
  }, []);

  // Determine if we should show active live indicators
  // For testing: if outside July 1-4, 2026, always show live line using system clock on selected day.
  // In July 2026: only show it on the matching day.
  const shouldShowLive = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    
    const isFestivalPeriod = dateStr >= '2026-07-01' && dateStr <= '2026-07-04';
    if (isFestivalPeriod) {
      return selectedDayId === dateStr;
    }
    return true; // Simulate live mode on any selected day outside festival dates
  }, [selectedDayId]);

  // 7. Favorite Timing Conflicts Detector
  const conflictActIds = useMemo(() => {
    const conflicts = new Set<string>();
    
    // Group favorites by day
    const favsByDay: Record<string, Act[]> = {};
    days.forEach((day) => {
      favsByDay[day.id] = day.acts.filter((act) => favorites.includes(act.id));
    });

    // Check adjacent overlaps per day
    Object.values(favsByDay).forEach((dayActs) => {
      const sorted = [...dayActs].sort((a, b) => a.startMinutes - b.startMinutes);
      for (let i = 0; i < sorted.length; i++) {
        for (let j = i + 1; j < sorted.length; j++) {
          const actA = sorted[i];
          const actB = sorted[j];
          // If Act B starts before Act A ends, we have an overlap!
          if (actB.startMinutes < actA.endMinutes) {
            conflicts.add(actA.id);
            conflicts.add(actB.id);
          } else {
            break; // Sorted by start time, so no subsequent band can start before A ends
          }
        }
      }
    });

    return conflicts;
  }, [days, favorites]);

  // 8. Share Favorites Handler
  const handleShareFavorites = () => {
    if (favorites.length === 0) {
      setToastMessage('Añade primero alguna banda a favoritos para compartir');
      setTimeout(() => setToastMessage(null), 2500);
      return;
    }

    const baseUrl = window.location.origin + window.location.pathname;
    const shareUrl = `${baseUrl}?favs=${encodeURIComponent(favorites.join(','))}`;

    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        setToastMessage('🔗 ¡Enlace de tu agenda copiado al portapapeles!');
        setTimeout(() => setToastMessage(null), 2500);
      })
      .catch(() => {
        setToastMessage('No se pudo copiar el enlace de forma automática');
        setTimeout(() => setToastMessage(null), 2500);
      });
  };

  // 9. Share App Handler (General Diffusion)
  const handleShareApp = () => {
    const baseUrl = window.location.origin + window.location.pathname;
    navigator.clipboard.writeText(baseUrl)
      .then(() => {
        setToastMessage('🔗 ¡Enlace de la app copiado! ¡Compártelo con tus amigos!');
        setTimeout(() => setToastMessage(null), 3000);
      })
      .catch(() => {
        setToastMessage('No se pudo copiar el enlace de la app');
        setTimeout(() => setToastMessage(null), 2500);
      });
  };

  // 10. Clear Favorites Handler
  const handleClearFavorites = () => {
    setFavorites([]);
    setToastMessage('🗑️ Se han borrado todos tus favoritos');
    setTimeout(() => setToastMessage(null), 2500);
  };

  // 11. Locate Stage in Map Handler
  const handleLocateStage = (stageName: string) => {
    setActiveTab('map');
    setToastMessage(`📍 Escenario ${stageName} ubicado en el mapa`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 12. Scroll to Current Time Handler
  const handleScrollToCurrentTime = () => {
    const activeDayId = getInitialDayId();

    const performScroll = () => {
      if (viewMode === 'hours') {
        const element = document.getElementById('act-playing-now');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setToastMessage('⏳ Desplazado al concierto actual');
          setTimeout(() => setToastMessage(null), 2000);
        } else {
          setToastMessage('No hay ningún concierto activo en este momento');
          setTimeout(() => setToastMessage(null), 2500);
        }
      } else {
        const redLine = document.getElementById('timeline-now-marker');
        if (redLine) {
          redLine.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
          setToastMessage('⏳ Desplazado a la hora actual');
          setTimeout(() => setToastMessage(null), 2000);
        } else {
          setToastMessage('Fuera de horario de festival');
          setTimeout(() => setToastMessage(null), 2500);
        }
      }
    };

    if (selectedDayId !== activeDayId) {
      setSelectedDayId(activeDayId);
      // Wait for React to switch and render the new day's acts
      setTimeout(performScroll, 120);
    } else {
      performScroll();
    }
  };

  // 9. Time filtering / sorting helpers
  const handleToggleFavorite = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation(); // prevent opening details when favoriting
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((favId) => favId !== id) : [...prev, id]
    );
  };

  const handleSelectAct = (act: Act) => {
    setSelectedAct(act);
    setIsDetailOpen(true);
  };

  const handleSaveFilters = (
    newOnlyFavorites: boolean,
    newVisibleStages: string[],
    newStagesOrder: string[]
  ) => {
    setOnlyFavorites(newOnlyFavorites);
    setVisibleStages(newVisibleStages);
    setStagesOrder(newStagesOrder);
  };

  // Determine if active filters exist (for red dot indicator in header)
  const hasActiveFilters = useMemo(() => {
    const isStagesModified = 
      visibleStages.length !== defaultStages.length ||
      stagesOrder.some((s, idx) => s !== defaultStages[idx]);
    return onlyFavorites || isStagesModified;
  }, [onlyFavorites, visibleStages, stagesOrder, defaultStages]);

  // 10. Filtered acts computation
  const filteredActs = useMemo(() => {
    // Determine scope of acts to filter (all days if searchGlobal is on, else current day)
    let actsPool: Act[] = [];
    if (searchGlobal && searchQuery.trim() !== '') {
      days.forEach((d) => {
        actsPool = [...actsPool, ...d.acts];
      });
    } else {
      actsPool = currentDay.acts;
    }

    return actsPool.filter((act) => {
      // Filter by search query
      const matchSearch = act.band.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Filter by visible stages
      const matchStage = visibleStages.includes(act.stage);
      
      // Filter by favorites only switch
      const matchFavorite = !onlyFavorites || favorites.includes(act.id);

      return matchSearch && matchStage && matchFavorite;
    });
  }, [currentDay, days, searchQuery, searchGlobal, visibleStages, onlyFavorites, favorites]);

  // Render the selected view
  const renderView = () => {
    if (viewMode === 'hours') {
      return (
        <HoursView
          acts={filteredActs}
          favorites={favorites}
          onToggleFavorite={handleToggleFavorite}
          onSelectAct={handleSelectAct}
          showGlobalDayBadge={searchGlobal && searchQuery.trim() !== ''}
          currentTimeMinutes={currentFestivalMinutes}
          shouldShowLive={shouldShowLive}
          conflictActIds={conflictActIds}
        />
      );
    } else {
      // In stages view, sort rows according to stagesOrder
      const orderedVisibleStages = stagesOrder.filter((stage) => visibleStages.includes(stage));
      return (
        <StagesView
          acts={filteredActs}
          stages={orderedVisibleStages}
          favorites={favorites}
          onToggleFavorite={handleToggleFavorite}
          onSelectAct={handleSelectAct}
          currentTimeMinutes={currentFestivalMinutes}
          shouldShowLive={shouldShowLive}
          conflictActIds={conflictActIds}
        />
      );
    }
  };

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      
      {/* VIEW 1: HOME PAGE (PORTADA) */}
      {activeTab === 'home' && (
        <div
          className="app-container animate-fade-in"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            background: 'var(--bg-primary)',
            overflowY: 'auto',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <h1 className="font-metal neon-text-glow" style={{ fontSize: '2.1rem', lineHeight: 1.1 }}>RESURRECTION</h1>
            <span style={{ fontSize: '0.85rem', letterSpacing: '4px', color: 'var(--text-secondary)', fontWeight: 800 }}>FEST 2026</span>
          </div>

          {/* Portada Cover Container with Overlaid Buttons */}
          <div
            className="glass-gradient-border-portada neon-glow"
            style={{
              maxWidth: '320px',
              width: '100%',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <img
              src="./images/PORTADA_RR.jpg"
              alt="Cartel Resurrection Fest"
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
              }}
            />

            {/* Linear dark gradient overlay to ensure text contrast for bottom buttons */}
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '110px',
                background: 'linear-gradient(to top, rgba(10, 11, 16, 0.95) 0%, rgba(10, 11, 16, 0.7) 40%, rgba(10, 11, 16, 0) 100%)',
                zIndex: 5,
              }}
            />

            {/* Horizontally aligned interior buttons */}
            <div
              style={{
                position: 'absolute',
                bottom: '16px',
                left: '12px',
                right: '12px',
                display: 'flex',
                gap: '8px',
                zIndex: 10,
              }}
            >
              {/* Agenda Tab */}
              <button
                onClick={() => setActiveTab('agenda')}
                style={{
                  flex: 1,
                  background: 'var(--gradient-accent)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '10px',
                  fontSize: '0.88rem',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 12px rgba(255, 42, 133, 0.3)',
                  transition: 'transform 0.1s',
                }}
                className="btn-interactive"
                onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.96)'; }}
                onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
              >
                <Calendar size={14} />
                Agenda
              </button>

              {/* Mapa Tab */}
              <button
                onClick={() => setActiveTab('map')}
                style={{
                  flex: 1,
                  background: 'rgba(255, 255, 255, 0.04)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '10px',
                  fontSize: '0.88rem',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'transform 0.1s',
                }}
                className="btn-interactive"
                onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.96)'; }}
                onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
              >
                <Map size={14} color="#ffd600" />
                Mapa
              </button>

              {/* Créditos Tab */}
              <button
                onClick={() => setActiveTab('credits')}
                style={{
                  flex: 1,
                  background: 'rgba(255, 255, 255, 0.04)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '10px',
                  fontSize: '0.88rem',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'transform 0.1s',
                }}
                className="btn-interactive"
                onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.96)'; }}
                onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
              >
                <Info size={14} color="#ffd600" />
                Créditos
              </button>
            </div>
          </div>

          {/* Share App Button (Difusión) */}
          <button
            onClick={handleShareApp}
            style={{
              marginTop: '24px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: '#ffffff',
              borderRadius: '12px',
              padding: '12px 24px',
              fontSize: '0.92rem',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'background 0.2s, transform 0.1s',
              maxWidth: '320px',
              width: '100%',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            }}
            className="btn-interactive"
            onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.96)'; }}
            onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            <Share2 size={16} color="#ff2a85" />
            Compartir App con amigos
          </button>

          {/* Visitor Counter Badge */}
          {visitCount !== null && (
            <div
              style={{
                marginTop: '16px',
                fontSize: '0.78rem',
                color: 'var(--text-muted)',
                fontWeight: '600',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                padding: '6px 12px',
                letterSpacing: '0.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                animation: 'fadeIn 0.5s ease-out forwards',
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: '#ff2a85',
                  boxShadow: '0 0 8px #ff2a85',
                  animation: 'pulseYellow 2s infinite ease-in-out',
                }}
              />
              <span>Visitas: {visitCount.toLocaleString()}</span>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: MAP VIEWER */}
      {activeTab === 'map' && (
        <div className="app-container animate-fade-in" style={{ background: 'var(--bg-primary)' }}>
          {/* Simple Header for Map Viewer */}
          <header
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 50,
              padding: '12px 16px',
              background: 'rgba(13, 15, 20, 0.75)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              borderBottom: '1px solid var(--border-color)',
              borderTop: 'var(--safe-top) solid transparent',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <button
              onClick={() => setActiveTab('home')}
              aria-label="Volver al inicio"
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
              <ArrowLeft size={18} />
            </button>

            <div style={{ textAlign: 'center' }}>
              <h1 className="font-metal neon-text-glow" style={{ fontSize: '1.25rem', lineHeight: 1.1 }}>MAPA DEL RECINTO</h1>
              <span style={{ fontSize: '0.62rem', letterSpacing: '2px', color: 'var(--text-secondary)', fontWeight: 800 }}>RESURRECTION FEST</span>
            </div>

            <div style={{ width: '38px' }} />
          </header>

          {/* Scrollable Container with Zoomable Map wrapped in Neon Gradient Border */}
          <main
            style={{
              flex: 1,
              overflow: 'auto',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '24px',
              background: 'var(--bg-primary)',
            }}
          >
            <div className="glass-gradient-border-portada neon-glow" style={{ maxWidth: '600px', width: '100%', overflow: 'hidden' }}>
              <img
                src="./images/MAPA.jpg"
                alt="Mapa del Resurrection Fest 2026"
                style={{
                  width: '100%',
                  height: 'auto',
                  display: 'block',
                }}
              />
            </div>
          </main>
        </div>
      )}

      {/* VIEW 3: CREDITS VIEWER */}
      {activeTab === 'credits' && (
        <div className="app-container animate-fade-in" style={{ background: 'var(--bg-primary)' }}>
          {/* Header for Credits Viewer */}
          <header
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 50,
              padding: '12px 16px',
              background: 'rgba(13, 15, 20, 0.75)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              borderBottom: '1px solid var(--border-color)',
              borderTop: 'var(--safe-top) solid transparent',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <button
              onClick={() => setActiveTab('home')}
              aria-label="Volver al inicio"
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
              <ArrowLeft size={18} />
            </button>

            <div style={{ textAlign: 'center' }}>
              <h1 className="font-metal neon-text-glow" style={{ fontSize: '1.25rem', lineHeight: 1.1 }}>CRÉDITOS</h1>
              <span style={{ fontSize: '0.62rem', letterSpacing: '2px', color: 'var(--text-secondary)', fontWeight: 800 }}>RESURRECTION FEST</span>
            </div>

            <div style={{ width: '38px' }} />
          </header>

          {/* Scrollable Container with Credits Image & Clickable Social Icons */}
          <main
            style={{
              flex: 1,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '24px',
              background: 'var(--bg-primary)',
              gap: '24px',
            }}
          >
            <div
              className="glass-gradient-border-portada neon-glow"
              style={{
                maxWidth: '320px',
                width: '100%',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <img
                src="./images/CREDITOS.jpg"
                alt="Créditos del Resurrection Fest"
                style={{
                  width: '100%',
                  height: 'auto',
                  display: 'block',
                }}
              />

              {/* Linear dark gradient overlay */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: '90px',
                  background: 'linear-gradient(to top, rgba(10, 11, 16, 0.95) 0%, rgba(10, 11, 16, 0.7) 40%, rgba(10, 11, 16, 0) 100%)',
                  zIndex: 5,
                }}
              />

              {/* Overlaid buttons at bottom inside image */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '16px',
                  left: '12px',
                  right: '12px',
                  display: 'flex',
                  gap: '8px',
                  zIndex: 10,
                }}
              >
                {/* Instagram Link */}
                <a
                  href="https://www.instagram.com/joseantoniofd.photo/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    flex: 1,
                    background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
                    color: '#ffffff',
                    textDecoration: 'none',
                    borderRadius: '12px',
                    padding: '10px',
                    fontSize: '0.88rem',
                    fontWeight: '800',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 10px rgba(220, 39, 67, 0.3)',
                    transition: 'transform 0.1s',
                  }}
                  className="btn-interactive"
                  onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.96)'; }}
                  onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
                  Instagram
                </a>

                {/* Facebook Link */}
                <a
                  href="https://www.facebook.com/joseantoniofernandezphoto"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    flex: 1,
                    background: '#1877f2',
                    color: '#ffffff',
                    textDecoration: 'none',
                    borderRadius: '12px',
                    padding: '10px',
                    fontSize: '0.88rem',
                    fontWeight: '800',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 12px rgba(24, 119, 242, 0.25)',
                    transition: 'transform 0.1s',
                  }}
                  className="btn-interactive"
                  onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.96)'; }}
                  onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}><path d="M18 2h-3a5 5 0 0 0 -5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                  Facebook
                </a>
              </div>
            </div>
          </main>
        </div>
      )}

      {/* VIEW 4: AGENDA (SCHEDULER) */}
      {activeTab === 'agenda' && (
        <div className="app-container">
          <Header
            days={days}
            selectedDayId={selectedDayId}
            onSelectDay={setSelectedDayId}
            viewMode={viewMode}
            onToggleViewMode={() => setViewMode(viewMode === 'hours' ? 'stages' : 'hours')}
            onOpenFilters={() => setIsFilterOpen(true)}
            hasActiveFilters={hasActiveFilters}
            onGoHome={() => setActiveTab('home')}
            onShare={handleShareFavorites}
          />

          <SearchBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchGlobal={searchGlobal}
            onSearchGlobalToggle={setSearchGlobal}
          />

          <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
            {renderView()}
          </main>

          {/* Floating Action Button: Go to Current Time */}
          {true && (
            <button
              onClick={handleScrollToCurrentTime}
              style={{
                position: 'fixed',
                bottom: '24px',
                right: '24px',
                zIndex: 90,
                background: 'rgba(15, 17, 24, 0.9)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 42, 133, 0.6)',
                color: '#ffffff',
                borderRadius: '24px',
                padding: '10px 16px',
                fontSize: '0.80rem',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 16px rgba(255, 42, 133, 0.25)',
                transition: 'transform 0.1s, background-color 0.2s',
              }}
              className="btn-interactive"
              onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.95)'; }}
              onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: '#ff2a85',
                  boxShadow: '0 0 8px #ff2a85',
                  animation: 'pulseYellow 1.5s infinite ease-in-out',
                }}
              />
              AHORA
            </button>
          )}
        </div>
      )}

      {/* GLOBAL MODALS AND OVERLAYS (Rendered on top of any active tab) */}
      <FilterDrawer
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        onlyFavorites={onlyFavorites}
        visibleStages={visibleStages}
        stagesOrder={stagesOrder}
        onSave={handleSaveFilters}
        defaultStages={defaultStages}
        onClearFavorites={handleClearFavorites}
      />

      <BandDetailModal
        act={selectedAct}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedAct(null);
        }}
        isFavorite={selectedAct ? favorites.includes(selectedAct.id) : false}
        onToggleFavorite={(id) => handleToggleFavorite(id)}
        conflictActIds={conflictActIds}
        favorites={favorites}
        onLocateStage={handleLocateStage}
      />

      {toastMessage && (
        <div
          className="glass animate-fade-in"
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(13, 15, 20, 0.95)',
            border: '1px solid var(--accent-red)',
            color: '#ffffff',
            padding: '12px 24px',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(255, 0, 60, 0.25)',
            zIndex: 1000,
            fontSize: '0.9rem',
            fontWeight: '700',
            textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          {toastMessage}
        </div>
      )}

      {pendingImport && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '20px',
          }}
          className="animate-fade-in"
        >
          <div
            className="glass"
            style={{
              width: '100%',
              maxWidth: '320px',
              padding: '24px',
              borderRadius: '20px',
              border: '1px solid var(--border-color)',
              textAlign: 'center',
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
            }}
          >
            <div style={{ color: 'var(--accent-red)', marginBottom: '14px' }}>
              <Share2 size={36} style={{ margin: '0 auto' }} />
            </div>
            <h2 className="font-metal" style={{ fontSize: '1.25rem', marginBottom: '8px' }}>
              IMPORTAR AGENDA
            </h2>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.4 }}>
              Te han compartido un itinerario con <strong>{pendingImport.length}</strong> bandas favoritas. ¿Qué deseas hacer?
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={() => {
                  setFavorites((prev) => Array.from(new Set([...prev, ...pendingImport])));
                  window.history.replaceState({}, document.title, window.location.pathname);
                  setPendingImport(null);
                  setToastMessage('✅ ¡Favoritos combinados con éxito!');
                  setTimeout(() => setToastMessage(null), 2500);
                }}
                style={{
                  background: 'var(--accent-red)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '12px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  boxShadow: '0 4px 10px rgba(255, 0, 60, 0.25)',
                }}
                className="btn-interactive"
              >
                Importar (Combinar con mis favoritos)
              </button>
              
              <button
                onClick={() => {
                  setFavorites(pendingImport);
                  window.history.replaceState({}, document.title, window.location.pathname);
                  setPendingImport(null);
                  setToastMessage('✅ Tu agenda ha sido reemplazada');
                  setTimeout(() => setToastMessage(null), 2500);
                }}
                style={{
                  background: 'rgba(255, 0, 60, 0.05)',
                  color: 'rgba(255, 255, 255, 0.65)',
                  border: '1px solid rgba(255, 0, 60, 0.3)',
                  borderRadius: '10px',
                  padding: '12px',
                  fontSize: '0.82rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
                className="btn-interactive"
              >
                Reemplazar (Borrará mis favoritos actuales)
              </button>

              <button
                onClick={() => {
                  window.history.replaceState({}, document.title, window.location.pathname);
                  setPendingImport(null);
                }}
                style={{
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '10px',
                  fontWeight: '500',
                  cursor: 'pointer',
                }}
              >
                Descartar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
