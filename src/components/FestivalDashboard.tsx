import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Header } from './Header';
import { SearchBar } from './SearchBar';
import { HoursView } from './HoursView';
import { StagesView } from './StagesView';
import { FilterDrawer } from './FilterDrawer';
import { BandDetailModal } from './BandDetailModal';
import { NewsView } from './NewsView';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Calendar, Map, ArrowLeft, Share2, Newspaper, Image } from 'lucide-react';
import { agendaFestData } from '../data/festivalData';
import type { Act, FestivalEdition, NoticiaItem } from '../data/festivalData';
import { PwaInstallModal } from './PwaInstallModal';
import { t, tFormat } from '../utils/translations';
import type { Language } from '../utils/translations';

const getYoutubeId = (url: string) => {
  if (!url) return '';
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : '';
};

interface FestivalDashboardProps {
  editionId: string;
  edition: FestivalEdition;
  onBackToSelector: () => void;
  language: Language;
  onChangeLanguage: (lang: Language) => void;
}

export const FestivalDashboard: React.FC<FestivalDashboardProps> = ({
  editionId,
  edition,
  onBackToSelector,
  language,
  onChangeLanguage,
}) => {
  const edicionConfig = edition.config;
  const days = edition.days;
  const allGlobalNews = useMemo(() => {
    const parseDDMMYYYY = (dateStr: string): Date => {
      const [d, m, y] = dateStr.split('/').map(Number);
      return new Date(y, m - 1, d);
    };

    const newsList: NoticiaItem[] = [];
    const editionsList = Object.values(agendaFestData) as FestivalEdition[];
    editionsList.forEach((ed: FestivalEdition) => {
      if (ed.noticias && Array.isArray(ed.noticias)) {
        ed.noticias.forEach((item: NoticiaItem) => {
          newsList.push(item);
        });
      }
    });

    return newsList
      .sort((a, b) => parseDDMMYYYY(b.fecha).getTime() - parseDDMMYYYY(a.fecha).getTime())
      .slice(0, 5);
  }, []);

  const defaultStages = useMemo(() => edition.stages.map(s => s.name), [edition.stages]);

  // Helper to determine the initial day based on current date-time and the Jornada schedule
  const getInitialDayId = useCallback((): string => {
    const now = new Date();
    if (!days || days.length === 0) {
      return edicionConfig.startDate;
    }

    for (let i = 0; i < days.length; i++) {
      const day = days[i];
      const [y, m, d] = day.id.split('-').map(Number);
      
      // Jornada ends at 03:30 AM (or 03:00 AM on the last day) on the NEXT calendar day
      const nextDayDate = new Date(y, m - 1, d + 1);
      const endTimeStr = (i === days.length - 1) ? '03:00:00' : '03:30:00';
      const [endH, endM, endS] = endTimeStr.split(':').map(Number);
      nextDayDate.setHours(endH, endM, endS, 0);
      
      // If current time is before the end of this day's jornada, this is the active day!
      if (now < nextDayDate) {
        return day.id;
      }
    }

    return days[days.length - 1].id;
  }, [days, edicionConfig]);

  // 1. App Navigation State (home, agenda, map, news, poster)
  const [activeTab, setActiveTab] = useState<'home' | 'agenda' | 'map' | 'news' | 'poster'>('home');
  const [isPwaModalOpen, setIsPwaModalOpen] = useState<boolean>(false);

  // 2. Persistent State
  const [selectedDayId, setSelectedDayId] = useState<string>(getInitialDayId());
  const [viewMode, setViewMode] = useLocalStorage<'hours' | 'stages'>(`af_${editionId}_view_mode`, 'hours');
  const [favorites, setFavorites] = useLocalStorage<string[]>(`af_${editionId}_favorites`, []);
  const [visibleStages, setVisibleStages] = useLocalStorage<string[]>(`af_${editionId}_visible_stages`, defaultStages);
  const [stagesOrder, setStagesOrder] = useLocalStorage<string[]>(`af_${editionId}_stages_order`, defaultStages);
  const [onlyFavorites, setOnlyFavorites] = useLocalStorage<boolean>(`af_${editionId}_only_favorites`, false);
  const [selectedCountries, setSelectedCountries] = useLocalStorage<string[]>(`af_${editionId}_selected_countries`, []);
  const [selectedGenres, setSelectedGenres] = useLocalStorage<string[]>(`af_${editionId}_selected_genres`, []);

  // 3. UI & Notification State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchGlobal, setSearchGlobal] = useState<boolean>(false);
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
  const [selectedAct, setSelectedAct] = useState<Act | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [pendingImport, setPendingImport] = useState<string[] | null>(null);
  const [visitCount, setVisitCount] = useState<number | null>(null);
  const [nextFavImgError, setNextFavImgError] = useState<boolean>(false);

  // 4. Days list shortcut
  const currentDay = useMemo(() => {
    return days.find((day) => day.id === selectedDayId) || days[0];
  }, [days, selectedDayId]);

  // 5. URL query string import checker (runs on load)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('favs')) {
      const editionParam = params.get('edition');
      if (editionParam && editionParam !== editionId) {
        return;
      }
      
      const favsStr = params.get('favs');
      if (favsStr) {
        const sharedIds = favsStr.split(',').filter(id => id.trim() !== '');
        
        // Filter: only keep IDs that match a day from this festival
        const validIds = sharedIds.filter(id => {
          const datePart = id.substring(0, 10);
          return days.some(d => d.id === datePart);
        });

        if (validIds.length > 0) {
          setPendingImport(validIds);
        }
      }
    }
  }, [editionId, days]);

  // 5a. Global Home navigation routing check
  useEffect(() => {
    const openAgendaFavs = window.localStorage.getItem(`af_${editionId}_open_agenda_favs`);
    if (openAgendaFavs === 'true') {
      window.localStorage.removeItem(`af_${editionId}_open_agenda_favs`);
      setActiveTab('agenda');
      setOnlyFavorites(true);
    }
    const openMap = window.localStorage.getItem(`af_${editionId}_open_map`);
    if (openMap === 'true') {
      window.localStorage.removeItem(`af_${editionId}_open_map`);
      setActiveTab('map');
    }
    const openNews = window.localStorage.getItem(`af_${editionId}_open_news`);
    if (openNews === 'true') {
      window.localStorage.removeItem(`af_${editionId}_open_news`);
      setActiveTab('news');
    }
  }, [editionId]);

  // 5b. Visitor Counter fetcher (CounterAPI.dev) & Title Updater
  useEffect(() => {
    // Dynamic document title
    document.title = `${edicionConfig.visibleName} - Agenda de Conciertos`;

    // Dynamic slug for counter API
    const slug = `joseafd_${edicionConfig.festivalId.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${edicionConfig.year}`;
    fetch(`https://api.counterapi.dev/v1/${slug}/page_views/up`)
      .then((res) => res.json())
      .then((data) => {
        if (data && typeof data.count === 'number') {
          setVisitCount(data.count);
        }
      })
      .catch((err) => {
        console.error('Error fetching visitor counter:', err);
      });
  }, [edicionConfig]);

  // 6. Current Festival Time Simulator Logic
  // Minute 0 of festival day starts at dayStartHour.
  const getFestivalMinutes = useCallback(() => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();

    let displayHour = hours;
    if (hours < edicionConfig.dayEndHour) {
      displayHour = hours + 24; // Treat 01:00 as 25:00
    }

    if (displayHour >= edicionConfig.dayStartHour && displayHour < (edicionConfig.dayStartHour + 14)) {
      return (displayHour - edicionConfig.dayStartHour) * 60 + minutes;
    }
    return -1; // Outside active timeline hours
  }, [edicionConfig]);

  const [currentFestivalMinutes, setCurrentFestivalMinutes] = useState<number>(getFestivalMinutes());

  // 1.1 Countdown Timer State & Effect (based on edicionConfig.startDate)
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);

  useEffect(() => {
    const [y, m, d] = edicionConfig.startDate.split('-').map(Number);
    const targetDate = new Date(y, m - 1, d, edicionConfig.dayStartHour, 0, 0); // Opening gates at dayStartHour
    
    const updateCountdown = () => {
      const now = new Date();
      const diff = targetDate.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeLeft(null); // Festival started
        return;
      }
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setTimeLeft({ days, hours, minutes, seconds });
    };
    
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [edicionConfig]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentFestivalMinutes(getFestivalMinutes());
    }, 30000); // Update every 30 seconds
    return () => clearInterval(timer);
  }, [getFestivalMinutes]);

  // Real-time / simulated date logic for Next Favorite Band
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 10000); // Update every 10 seconds
    return () => clearInterval(timer);
  }, []);

  const getSimulatedOrRealTime = useCallback((realTime: Date): Date => {
    const params = new URLSearchParams(window.location.search);
    const isDemo = params.get('demo') === 'true' || window.localStorage.getItem('af_demo_mode') === 'true';
    if (!isDemo) {
      return realTime;
    }

    const dateStr = `${realTime.getFullYear()}-${(realTime.getMonth() + 1).toString().padStart(2, '0')}-${realTime.getDate().toString().padStart(2, '0')}`;
    const isFestivalPeriod = dateStr >= edicionConfig.startDate && dateStr <= edicionConfig.endDate;
    
    if (isFestivalPeriod) {
      return realTime;
    }
    
    if (!days || days.length === 0) return realTime;
    const firstDay = days[0];
    const [y, m, d] = firstDay.id.split('-').map(Number);
    
    const simulated = new Date(y, m - 1, d);
    simulated.setHours(realTime.getHours(), realTime.getMinutes(), realTime.getSeconds(), 0);
    
    // Fallback: if simulated time is outside festival timeline, force 18:30 for demo purposes
    const currentHours = realTime.getHours();
    if (currentHours < edicionConfig.dayStartHour && currentHours >= edicionConfig.dayEndHour) {
      simulated.setHours(18, 30, 0, 0);
    }
    return simulated;
  }, [days, edicionConfig]);

  const getActAbsoluteStartTime = useCallback((act: Act): Date => {
    const datePart = act.id.substring(0, 10);
    const [y, m, d] = datePart.split('-').map(Number);
    const [h, min] = act.start.split(':').map(Number);
    
    const actDate = new Date(y, m - 1, d);
    if (h < edicionConfig.dayEndHour) {
      actDate.setDate(actDate.getDate() + 1);
    }
    actDate.setHours(h, min, 0, 0);
    return actDate;
  }, [edicionConfig]);

  const getActLocalizedDayNameAndHour = useCallback((act: Act, lang: Language): string => {
    const datePart = act.id.substring(0, 10);
    const day = days.find(d => d.id === datePart);
    if (!day) return act.start;
    
    const weekdayTranslations: Record<string, Record<Language, string>> = {
      'miercoles': { es: 'Miér', en: 'Wed', fr: 'Mer' },
      'jueves': { es: 'Jue', en: 'Thu', fr: 'Jeu' },
      'viernes': { es: 'Vie', en: 'Fri', fr: 'Ven' },
      'sabado': { es: 'Sáb', en: 'Sat', fr: 'Sam' },
      'domingo': { es: 'Dom', en: 'Sun', fr: 'Dim' },
      'miércoles': { es: 'Miér', en: 'Wed', fr: 'Mer' },
      'sábado': { es: 'Sáb', en: 'Sat', fr: 'Sam' },
    };

    const wKey = day.weekdayEs.toLowerCase();
    const shortWeekday = weekdayTranslations[wKey]?.[lang] || day.weekdayEs.substring(0, 3);
    return `${shortWeekday}, ${act.start}`;
  }, [days]);

  const nextFavoriteAct = useMemo(() => {
    if (favorites.length === 0 || !days) return null;
    
    const simTime = getSimulatedOrRealTime(currentTime);
    const list: Array<{ act: Act; startTime: Date; endTime: Date; status: 'live' | 'upcoming'; minutesToStart: number; stageColor: string }> = [];
    
    days.forEach((day) => {
      day.acts.forEach((act) => {
        if (favorites.includes(act.id)) {
          const startTime = getActAbsoluteStartTime(act);
          const endTime = new Date(startTime.getTime() + act.duration * 60 * 1000);
          
          if (simTime < endTime) {
            const isLive = simTime >= startTime;
            const status = isLive ? 'live' : 'upcoming';
            const minutesToStart = Math.round((startTime.getTime() - simTime.getTime()) / (60 * 1000));
            const stageObj = edition.stages.find(s => s.name === act.stage);
            const stageColor = stageObj ? stageObj.color : '#ffffff';
            
            list.push({
              act,
              startTime,
              endTime,
              status,
              minutesToStart,
              stageColor,
            });
          }
        }
      });
    });
    
    if (list.length === 0) return null;
    
    // Sort: live first, then chronologically
    list.sort((a, b) => {
      if (a.status === 'live' && b.status !== 'live') return -1;
      if (a.status !== 'live' && b.status === 'live') return 1;
      return a.startTime.getTime() - b.startTime.getTime();
    });
    
    return list[0];
  }, [days, favorites, currentTime, getSimulatedOrRealTime, getActAbsoluteStartTime, edition.stages]);

  useEffect(() => {
    setNextFavImgError(false);
  }, [nextFavoriteAct?.act?.id]);

  // Determine if we should show active live indicators
  // For testing: if outside festival dates, always show live line using system clock on selected day.
  // During festival dates: only show it on the matching day.
  const shouldShowLive = useMemo(() => {
    const now = new Date();
    if (!days || days.length === 0) return false;
    
    // Check if we are within the festival period (from startDate start hour to endDate end of last day's jornada)
    const firstDay = days[0];
    const [startY, startM, startD] = firstDay.id.split('-').map(Number);
    const startOfFestival = new Date(startY, startM - 1, startD, edicionConfig.dayStartHour, 0, 0);
    
    const lastDay = days[days.length - 1];
    const [endY, endM, endD] = lastDay.id.split('-').map(Number);
    const endOfFestival = new Date(endY, endM - 1, endD + 1, edicionConfig.dayEndHour, 0, 0);
    
    const isFestivalPeriod = now >= startOfFestival && now <= endOfFestival;
    if (isFestivalPeriod) {
      return selectedDayId === getInitialDayId();
    }
    return true; // Simulate live mode on any selected day outside festival dates
  }, [selectedDayId, getInitialDayId, days, edicionConfig]);

  // Determine if the festival is completely over (passed Sunday morning of the last day's jornada)
  const isFestivalOver = useMemo(() => {
    const now = new Date();
    if (!days || days.length === 0) return false;
    const lastDay = days[days.length - 1];
    const [y, m, d] = lastDay.id.split('-').map(Number);
    // Last day's concerts end at dayEndHour AM on the next day
    const endOfFestival = new Date(y, m - 1, d + 1, edicionConfig.dayEndHour, 0, 0);
    return now > endOfFestival;
  }, [days, edicionConfig]);

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
      setToastMessage(t(language, 'toastNoFavsShare'));
      setTimeout(() => setToastMessage(null), 2500);
      return;
    }

    const baseUrl = window.location.origin + window.location.pathname;
    const shareUrl = `${baseUrl}?edition=${editionId}&favs=${encodeURIComponent(favorites.join(','))}`;

    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        setToastMessage(t(language, 'toastShareSuccess'));
        setTimeout(() => setToastMessage(null), 2500);
      })
      .catch(() => {
        setToastMessage(t(language, 'toastShareError'));
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
      setTimeout(performScroll, 120);
    } else {
      performScroll();
    }
  };

  const handleToggleFavorite = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
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
    newStagesOrder: string[],
    newSelectedCountries: string[],
    newSelectedGenres: string[]
  ) => {
    setOnlyFavorites(newOnlyFavorites);
    setVisibleStages(newVisibleStages);
    setStagesOrder(newStagesOrder);
    setSelectedCountries(newSelectedCountries);
    setSelectedGenres(newSelectedGenres);
  };

  const hasActiveFilters = useMemo(() => {
    const isStagesModified = 
      visibleStages.length !== defaultStages.length ||
      stagesOrder.some((s, idx) => s !== defaultStages[idx]);
    return onlyFavorites || isStagesModified || selectedCountries.length > 0 || selectedGenres.length > 0;
  }, [onlyFavorites, visibleStages, stagesOrder, selectedCountries, selectedGenres, defaultStages]);

  const allCountries = useMemo(() => {
    const countries = new Set<string>();
    days.forEach((day) => {
      day.acts.forEach((act) => {
        if (act.bio?.country) {
          countries.add(act.bio.country.trim());
        }
      });
    });
    return Array.from(countries).sort();
  }, [days]);

  const allGenres = useMemo(() => {
    const genres = new Set<string>();
    days.forEach((day) => {
      day.acts.forEach((act) => {
        if (act.bio?.genre) {
          genres.add(act.bio.genre.trim());
        }
      });
    });
    return Array.from(genres).sort();
  }, [days]);

  const filteredActs = useMemo(() => {
    let actsPool: Act[] = [];
    if (searchGlobal && searchQuery.trim() !== '') {
      days.forEach((d) => {
        actsPool = [...actsPool, ...d.acts];
      });
    } else {
      actsPool = currentDay.acts;
    }

    return actsPool.filter((act) => {
      const query = searchQuery.toLowerCase().trim();
      const matchSearch = 
        act.band.toLowerCase().includes(query) ||
        (act.bio?.description?.toLowerCase().includes(query)) ||
        (act.bio?.country?.toLowerCase().includes(query)) ||
        (act.bio?.genre?.toLowerCase().includes(query));
      
      const matchStage = visibleStages.includes(act.stage);
      const matchFavorite = !onlyFavorites || favorites.includes(act.id);
      
      const matchCountry = selectedCountries.length === 0 || 
        (act.bio?.country && selectedCountries.includes(act.bio.country.trim()));

      const matchGenre = selectedGenres.length === 0 || 
        (act.bio?.genre && selectedGenres.includes(act.bio.genre.trim()));

      return matchSearch && matchStage && matchFavorite && matchCountry && matchGenre;
    });
  }, [currentDay, days, searchQuery, searchGlobal, visibleStages, onlyFavorites, favorites, selectedCountries, selectedGenres]);

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
          dayStartHour={edicionConfig.dayStartHour}
          editionStages={edition.stages}
          days={days}
        />
      );
    } else {
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
          dayStartHour={edicionConfig.dayStartHour}
          dayEndHour={edicionConfig.dayEndHour}
          editionStages={edition.stages}
        />
      );
    }
  };

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
      
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
            position: 'relative',
          }}
        >
          {/* Ambient Video Background */}
          {edicionConfig.aftermovieUrl && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: '100%',
                height: '100%',
                overflow: 'hidden',
                zIndex: 0,
                pointerEvents: 'none',
              }}
            >
              <iframe
                title="Aftermovie Background"
                src={`https://www.youtube.com/embed/${getYoutubeId(edicionConfig.aftermovieUrl)}?autoplay=1&mute=1&loop=1&playlist=${getYoutubeId(edicionConfig.aftermovieUrl)}&controls=0&showinfo=0&rel=0&playsinline=1&modestbranding=1`}
                frameBorder="0"
                allow="autoplay; encrypted-media"
                style={{
                  width: '100vw',
                  height: '56.25vw',
                  minHeight: '100vh',
                  minWidth: '177.77vh',
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  opacity: 0.25,
                  filter: 'blur(8px) saturate(1.5)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'radial-gradient(circle, rgba(13,15,20,0.5) 0%, rgba(13,15,20,0.95) 100%)',
                }}
              />
            </div>
          )}

          {/* Content Wrapper */}
          <div
            style={{
              position: 'relative',
              zIndex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: 'auto',
            }}
          >
          {/* Back to Selector Menu Button */}
          <button
            onClick={onBackToSelector}
            style={{
              position: 'absolute',
              top: '20px',
              left: '20px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              padding: '10px',
              borderRadius: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
              transition: 'background 0.2s',
            }}
            className="btn-interactive"
            title={t(language, 'backToSelector')}
          >
            <ArrowLeft size={18} />
          </button>

          <div style={{ textAlign: 'center', marginBottom: '20px', paddingLeft: '40px', paddingRight: '40px' }}>
            <h1 className="font-metal neon-text-glow" style={{ fontSize: '1.8rem', lineHeight: 1.1, textTransform: 'uppercase' }}>
              {edicionConfig.festivalName}
            </h1>
            <span style={{ fontSize: '0.8rem', letterSpacing: '3px', color: 'var(--text-secondary)', fontWeight: 800, textTransform: 'uppercase' }}>
              {edicionConfig.location} {edicionConfig.year}
            </span>
          </div>

          {/* Countdown Timer */}
          {timeLeft ? (
            <div
              style={{
                marginBottom: '20px',
                padding: '10px 16px',
                background: 'rgba(15, 17, 24, 0.65)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 214, 0, 0.25)',
                borderRadius: '12px',
                color: '#ffffff',
                textAlign: 'center',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4), 0 0 10px rgba(255, 214, 0, 0.05)',
                maxWidth: '320px',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <div style={{ fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: '1.5px', color: '#ffd600', fontWeight: '800' }}>
                {t(language, 'countdownTitle')}
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: '900', color: '#ffffff', lineHeight: 1.1 }}>{timeLeft.days}</span>
                  <span style={{ fontSize: '0.5rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{t(language, 'daysLabel')}</span>
                </div>
                <span style={{ fontSize: '1.25rem', fontWeight: '900', color: 'rgba(255,255,255,0.4)', lineHeight: 1.1 }}>:</span>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: '900', color: '#ffffff', lineHeight: 1.1 }}>{String(timeLeft.hours).padStart(2, '0')}</span>
                  <span style={{ fontSize: '0.5rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{t(language, 'hoursLabel')}</span>
                </div>
                <span style={{ fontSize: '1.25rem', fontWeight: '900', color: 'rgba(255,255,255,0.4)', lineHeight: 1.1 }}>:</span>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: '900', color: '#ffffff', lineHeight: 1.1 }}>{String(timeLeft.minutes).padStart(2, '0')}</span>
                  <span style={{ fontSize: '0.5rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{t(language, 'minutesLabel')}</span>
                </div>
                <span style={{ fontSize: '1.25rem', fontWeight: '900', color: 'rgba(255,255,255,0.4)', lineHeight: 1.1 }}>:</span>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: '900', color: '#ff2a85', lineHeight: 1.1 }}>{String(timeLeft.seconds).padStart(2, '0')}</span>
                  <span style={{ fontSize: '0.5rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{t(language, 'secondsLabel')}</span>
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                marginBottom: '20px',
                padding: '6px 12px',
                background: isFestivalOver ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 42, 133, 0.08)',
                border: isFestivalOver ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgba(255, 42, 133, 0.3)',
                borderRadius: '10px',
                color: '#ffffff',
                fontSize: '0.78rem',
                fontWeight: '800',
                letterSpacing: '0.5px',
                boxShadow: isFestivalOver ? '0 0 10px rgba(255, 255, 255, 0.05)' : '0 0 10px rgba(255, 42, 133, 0.1)',
                animation: 'pulseYellow 2s infinite ease-in-out',
                maxWidth: '320px',
                textAlign: 'center',
                width: '100%',
              }}
            >
              {isFestivalOver ? t(language, 'festivalFinished') : t(language, 'festivalStarted')}
            </div>
          )}

          {/* Next Favorite Band Card */}
          {nextFavoriteAct && (
            <div
              onClick={() => handleSelectAct(nextFavoriteAct.act)}
              style={{
                marginBottom: '20px',
                padding: '12px 14px',
                background: nextFavoriteAct.status === 'live'
                  ? 'linear-gradient(135deg, rgba(255, 42, 133, 0.25) 0%, rgba(13, 15, 20, 0.75) 100%)'
                  : 'rgba(15, 17, 24, 0.65)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: nextFavoriteAct.status === 'live'
                  ? '1px solid rgba(255, 42, 133, 0.6)'
                  : '1px solid var(--border-color)',
                borderRadius: '16px',
                color: '#ffffff',
                cursor: 'pointer',
                textAlign: 'left',
                boxShadow: nextFavoriteAct.status === 'live'
                  ? '0 8px 24px rgba(255, 42, 133, 0.2), 0 0 12px rgba(255, 42, 133, 0.1)'
                  : '0 4px 16px rgba(0, 0, 0, 0.3)',
                maxWidth: '320px',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                animation: 'fadeIn 0.3s ease-out',
                transition: 'transform 0.15s, border-color 0.15s',
              }}
              className="btn-interactive news-card"
            >
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  background: 'rgba(0, 0, 0, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  position: 'relative',
                }}
              >
                {!nextFavImgError ? (
                  <img
                    src={`./images/${nextFavoriteAct.act.band.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9\s-]/g, "").trim().replace(/[\s-]+/g, " ")}.jpg`}
                    alt=""
                    onError={() => setNextFavImgError(true)}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  <span style={{ fontSize: '0.85rem', fontWeight: '800', color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-display)' }}>
                    {nextFavoriteAct.act.band.substring(0, 2).toUpperCase()}
                  </span>
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      fontSize: '0.6rem',
                      background: nextFavoriteAct.status === 'live' ? 'var(--accent-red)' : 'rgba(255, 255, 255, 0.08)',
                      color: '#ffffff',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontWeight: '800',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    {nextFavoriteAct.status === 'live' 
                      ? (language === 'en' ? '● LIVE' : language === 'fr' ? '● EN DIRECT' : '● EN DIRECTO')
                      : (language === 'en' ? 'NEXT FAVORITE' : language === 'fr' ? 'PROCHAIN FAVORIS' : 'SIGUIENTE FAVORITO')
                    }
                  </span>
                  {nextFavoriteAct.status === 'upcoming' && (
                    <span style={{ fontSize: '0.68rem', color: '#ffd600', fontWeight: '800' }}>
                      {nextFavoriteAct.minutesToStart <= 120 
                        ? (language === 'en' ? `In ${nextFavoriteAct.minutesToStart} min` : language === 'fr' ? `Dans ${nextFavoriteAct.minutesToStart} min` : `En ${nextFavoriteAct.minutesToStart} min`)
                        : nextFavoriteAct.minutesToStart >= 1440
                        ? (language === 'en' 
                            ? `${Math.round(nextFavoriteAct.minutesToStart / 1440)} days left` 
                            : language === 'fr' 
                            ? `Dans ${Math.round(nextFavoriteAct.minutesToStart / 1440)} jours` 
                            : `Faltan ${Math.round(nextFavoriteAct.minutesToStart / 1440)} días`)
                        : getActLocalizedDayNameAndHour(nextFavoriteAct.act, language)
                      }
                    </span>
                  )}
                </div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: '800', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {nextFavoriteAct.act.band}
                </h4>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: '700' }}>{nextFavoriteAct.act.start} - {nextFavoriteAct.act.end}</span>
                  <span>•</span>
                  <span style={{ color: nextFavoriteAct.stageColor, fontWeight: '600' }}>{nextFavoriteAct.act.stage}</span>
                </div>
              </div>
            </div>
          )}

          {/* Portada Cover Container with Overlaid Buttons */}
          <div
            className="glass-gradient-border-portada neon-glow"
            style={{
              maxWidth: '320px',
              width: '100%',
              position: 'relative',
              overflow: 'hidden',
              aspectRatio: edicionConfig.aftermovieUrl ? '16/9' : 'auto',
              background: '#0d0f14',
            }}
          >
            {edicionConfig.aftermovieUrl ? (
              <div style={{ width: '100%', height: '100%', pointerEvents: 'none' }}>
                <iframe
                  title="Aftermovie Card"
                  src={`https://www.youtube.com/embed/${getYoutubeId(edicionConfig.aftermovieUrl)}?autoplay=1&mute=1&loop=1&playlist=${getYoutubeId(edicionConfig.aftermovieUrl)}&controls=0&showinfo=0&rel=0&playsinline=1&modestbranding=1`}
                  frameBorder="0"
                  allow="autoplay; encrypted-media"
                  style={{
                    width: '100%',
                    height: '100%',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                  }}
                />
              </div>
            ) : (
              <img
                src={`./images/${edicionConfig.cartel}`}
                alt={`Cartel ${edicionConfig.festivalName}`}
                style={{
                  width: '100%',
                  height: 'auto',
                  display: 'block',
                }}
              />
            )}

            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: edicionConfig.aftermovieUrl ? '70px' : '110px',
                background: 'linear-gradient(to top, rgba(10, 11, 16, 0.95) 0%, rgba(10, 11, 16, 0.7) 40%, rgba(10, 11, 16, 0) 100%)',
                zIndex: 5,
              }}
            />

            <div
              style={{
                position: 'absolute',
                bottom: '20px',
                left: 0,
                right: 0,
                display: 'flex',
                justifyContent: 'center',
                gap: '16px',
                zIndex: 10,
              }}
            >
              {/* Cartel Icon */}
              <button
                onClick={() => setActiveTab('poster')}
                aria-label="Cartel"
                title="Cartel"
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'rgba(0, 230, 118, 0.15)',
                  border: '2px solid rgba(0, 230, 118, 0.8)',
                  color: '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 12px rgba(0, 230, 118, 0.4)',
                  transition: 'transform 0.1s, background-color 0.2s',
                }}
                className="btn-interactive"
              >
                <Image size={20} color="#00e676" />
              </button>

              {/* Agenda Icon */}
              <button
                onClick={() => setActiveTab('agenda')}
                aria-label="Agenda"
                title="Agenda"
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'rgba(255, 42, 133, 0.15)',
                  border: '2px solid rgba(255, 42, 133, 0.8)',
                  color: '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 12px rgba(255, 42, 133, 0.4)',
                  transition: 'transform 0.1s, background-color 0.2s',
                }}
                className="btn-interactive"
              >
                <Calendar size={20} color="#ff2a85" />
              </button>

              {/* Noticias Icon */}
              <button
                onClick={() => setActiveTab('news')}
                aria-label="Noticias"
                title="Noticias"
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'rgba(0, 198, 255, 0.15)',
                  border: '2px solid rgba(0, 198, 255, 0.8)',
                  color: '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 12px rgba(0, 198, 255, 0.4)',
                  transition: 'transform 0.1s, background-color 0.2s',
                }}
                className="btn-interactive"
              >
                <Newspaper size={20} color="#00c6ff" />
              </button>

              {/* Mapa Icon */}
              <button
                onClick={() => setActiveTab('map')}
                aria-label="Mapa"
                title="Mapa"
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'rgba(255, 214, 0, 0.15)',
                  border: '2px solid rgba(255, 214, 0, 0.8)',
                  color: '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 12px rgba(255, 214, 0, 0.4)',
                  transition: 'transform 0.1s, background-color 0.2s',
                }}
                className="btn-interactive"
              >
                <Map size={20} color="#ffd600" />
              </button>
            </div>
          </div>

          {/* Cambiar de festival button at bottom */}
          <button
            onClick={onBackToSelector}
            style={{
              marginTop: '16px',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              color: 'var(--text-secondary)',
              borderRadius: '12px',
              padding: '10px 20px',
              fontSize: '0.82rem',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'background 0.2s',
              maxWidth: '320px',
              width: '100%',
            }}
            className="btn-interactive"
          >
            {t(language, 'backToSelector')}
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
        </div>
      )}

      {/* VIEW 2: MAP VIEWER */}
      {activeTab === 'map' && (
        <div className="app-container animate-fade-in" style={{ background: 'var(--bg-primary)' }}>
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
                transition: 'background 0.2s',
              }}
              className="btn-interactive"
            >
              <ArrowLeft size={18} />
            </button>

            <div style={{ textAlign: 'center' }}>
              <h1 className="font-metal neon-text-glow" style={{ fontSize: '1.25rem', lineHeight: 1.1 }}>MAPA DEL RECINTO</h1>
              <span style={{ fontSize: '0.62rem', letterSpacing: '2px', color: 'var(--text-secondary)', fontWeight: 800, textTransform: 'uppercase' }}>{edicionConfig.festivalName}</span>
            </div>

            <div style={{ width: '38px' }} />
          </header>

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
                src={`./images/${edicionConfig.mapa}`}
                alt={`Mapa del ${edicionConfig.festivalName} ${edicionConfig.year}`}
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



      {/* VIEW 6: POSTER VIEWER */}
      {activeTab === 'poster' && (
        <div className="app-container animate-fade-in" style={{ background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', height: '100%' }}>
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
              aria-label={language === 'es' ? 'Volver al inicio' : 'Back to home'}
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
                transition: 'background 0.2s',
              }}
              className="btn-interactive"
            >
              <ArrowLeft size={18} />
            </button>

            <div style={{ textAlign: 'center' }}>
              <h1 className="font-metal neon-text-glow" style={{ fontSize: '1.15rem', lineHeight: 1.1, textTransform: 'uppercase' }}>
                {language === 'es' ? 'Cartel Oficial' : language === 'en' ? 'Official Poster' : 'Affiche Officielle'}
              </h1>
              <span style={{ fontSize: '0.62rem', letterSpacing: '2px', color: 'var(--text-secondary)', fontWeight: 800 }}>
                {edicionConfig.visibleName}
              </span>
            </div>

            <div style={{ width: '38px' }} />
          </header>

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
            <div className="glass-gradient-border-portada neon-glow" style={{ maxWidth: '500px', width: '100%', overflow: 'hidden', borderRadius: '16px' }}>
              <img
                src={`./images/${edicionConfig.cartel}`}
                alt={`Cartel de ${edicionConfig.visibleName}`}
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



      {/* VIEW 5: NEWS VIEWER */}
      {activeTab === 'news' && (
        <NewsView
          noticias={allGlobalNews}
          onBackToHome={() => setActiveTab('home')}
          festivalName=""
          language={language}
        />
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
            onOpenPwaGuide={() => setIsPwaModalOpen(true)}
            festivalName={edicionConfig.visibleName}
            location={edicionConfig.location}
            year={edicionConfig.year}
            language={language}
            onChangeLanguage={onChangeLanguage}
          />

          <SearchBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchGlobal={searchGlobal}
            onSearchGlobalToggle={setSearchGlobal}
            language={language}
          />

          <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
            {renderView()}
          </main>

          {/* Floating Action Button: Go to Current Time */}
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
            {language === 'en' ? 'NOW' : language === 'fr' ? 'MAINTENANT' : 'AHORA'}
          </button>
        </div>
      )}

      {/* GLOBAL MODALS AND OVERLAYS */}
      <FilterDrawer
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        onlyFavorites={onlyFavorites}
        visibleStages={visibleStages}
        stagesOrder={stagesOrder}
        selectedCountries={selectedCountries}
        selectedGenres={selectedGenres}
        allCountries={allCountries}
        allGenres={allGenres}
        stagesConfig={edition.stages}
        onSave={handleSaveFilters}
        defaultStages={defaultStages}
        onClearFavorites={handleClearFavorites}
        language={language}
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
        days={days}
        editionStages={edition.stages}
        language={language}
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
              {t(language, 'importTitle')}
            </h2>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.4 }}>
              {tFormat(language, 'importDesc', { count: pendingImport.length })}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={() => {
                  setFavorites((prev) => Array.from(new Set([...prev, ...pendingImport])));
                  window.history.replaceState({}, document.title, window.location.pathname);
                  setPendingImport(null);
                  setToastMessage(t(language, 'toastMergeSuccess'));
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
                {t(language, 'importMerge')}
              </button>
              
              <button
                onClick={() => {
                  setFavorites(pendingImport);
                  window.history.replaceState({}, document.title, window.location.pathname);
                  setPendingImport(null);
                  setToastMessage(t(language, 'toastReplaceSuccess'));
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
                {t(language, 'importReplace')}
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
                {t(language, 'importDiscard')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PWA / Share / Credits Modal */}
      <PwaInstallModal
        isOpen={isPwaModalOpen}
        onClose={() => setIsPwaModalOpen(false)}
        festivalName={edicionConfig.visibleName}
        year={edicionConfig.year}
        language={language}
      />
    </div>
  );
};
