import React, { useMemo } from 'react';
import { AlertTriangle, Zap, ArrowRight } from 'lucide-react';
import type { FestivalEdition, Act } from '../data/festivalData';
import { t, tFormat } from '../utils/translations';
import type { Language } from '../utils/translations';

interface ContinueAgendaSectionProps {
  editions: FestivalEdition[];
  language: Language;
  onSelectEdition: (id: string, initialTab?: string) => void;
  onScrollToMyFestivals: () => void;
}

export const ContinueAgendaSection: React.FC<ContinueAgendaSectionProps> = ({
  editions,
  language,
  onSelectEdition,
  onScrollToMyFestivals,
}) => {
  // 1. Gather all favorites and conflict counts per edition
  const editionsWithFavs = useMemo(() => {
    const list: Array<{
      edition: FestivalEdition;
      favoritesCount: number;
      clashesCount: number;
      lastOpenedTime: number;
      closenessDays: number;
      nextOrLiveAct: { act: Act; status: 'live' | 'upcoming'; minutesToStart: number } | null;
    }> = [];

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    editions.forEach((ed) => {
      const edId = ed.config.edicionId;
      let favs: string[] = [];
      try {
        const favsStr = window.localStorage.getItem(`af_${edId}_favorites`);
        if (favsStr) {
          favs = JSON.parse(favsStr);
        }
      } catch (e) {
        // ignore
      }

      if (!Array.isArray(favs) || favs.length === 0) return;

      // Calculate clashes count
      let clashesCount = 0;
      const favActs = ed.days.flatMap(d => d.acts.filter(a => favs.includes(a.id)));
      const sortedActs = [...favActs].sort((a, b) => a.startMinutes - b.startMinutes);
      for (let i = 0; i < sortedActs.length; i++) {
        for (let j = i + 1; j < sortedActs.length; j++) {
          const a = sortedActs[i];
          const b = sortedActs[j];
          // Check if same day (first 10 chars of id represent day id)
          const sameDay = a.id.substring(0, 10) === b.id.substring(0, 10);
          if (sameDay) {
            const overlap = a.startMinutes < b.endMinutes && b.startMinutes < a.endMinutes;
            if (overlap) {
              clashesCount++;
              break; // count once per act
            }
          }
        }
      }

      // Last opened timing
      const lastOpened = window.localStorage.getItem('af_last_opened_edition');
      const lastOpenedTime = lastOpened === edId ? 1 : 0;

      // Closeness in days
      const [y, m, d] = ed.config.startDate.split('-').map(Number);
      const startDateTime = new Date(y, m - 1, d).getTime();
      const closenessDays = Math.abs(startDateTime - now.getTime());

      // Next / Live favorite act calculation
      let nextOrLiveAct: { act: Act; status: 'live' | 'upcoming'; minutesToStart: number } | null = null;
      
      // Determine simulation time (consistent with FestivalDashboard logic)
      const getSimulatedOrRealTime = (realTime: Date): Date => {
        const dateStr = `${realTime.getFullYear()}-${(realTime.getMonth() + 1).toString().padStart(2, '0')}-${realTime.getDate().toString().padStart(2, '0')}`;
        const isFestivalPeriod = dateStr >= ed.config.startDate && dateStr <= ed.config.endDate;
        if (isFestivalPeriod) return realTime;

        if (!ed.days || ed.days.length === 0) return realTime;
        const firstDay = ed.days[0];
        const [fY, fM, fD] = firstDay.id.split('-').map(Number);
        
        const simulated = new Date(fY, fM - 1, fD);
        simulated.setHours(realTime.getHours(), realTime.getMinutes(), realTime.getSeconds(), 0);
        
        const currentHours = realTime.getHours();
        if (currentHours < ed.config.dayStartHour && currentHours >= ed.config.dayEndHour) {
          simulated.setHours(18, 30, 0, 0);
        }
        return simulated;
      };

      const getActAbsoluteStartTime = (act: Act): Date => {
        const datePart = act.id.substring(0, 10);
        const [aY, aM, aD] = datePart.split('-').map(Number);
        const [aH, aMin] = act.start.split(':').map(Number);
        const actDate = new Date(aY, aM - 1, aD);
        if (aH < ed.config.dayEndHour) {
          actDate.setDate(actDate.getDate() + 1);
        }
        actDate.setHours(aH, aMin, 0, 0);
        return actDate;
      };

      const simTime = getSimulatedOrRealTime(now);
      const upcomingFavsList: Array<{ act: Act; startTime: Date; endTime: Date; status: 'live' | 'upcoming'; minutesToStart: number }> = [];

      ed.days.forEach((day) => {
        day.acts.forEach((act) => {
          if (favs.includes(act.id)) {
            const startTime = getActAbsoluteStartTime(act);
            const endTime = new Date(startTime.getTime() + act.duration * 60 * 1000);
            if (simTime < endTime) {
              const isLive = simTime >= startTime;
              const status = isLive ? 'live' : 'upcoming';
              const minutesToStart = Math.round((startTime.getTime() - simTime.getTime()) / (60 * 1000));
              upcomingFavsList.push({ act, startTime, endTime, status, minutesToStart });
            }
          }
        });
      });

      if (upcomingFavsList.length > 0) {
        upcomingFavsList.sort((x, y) => {
          if (x.status === 'live' && y.status !== 'live') return -1;
          if (x.status !== 'live' && y.status === 'live') return 1;
          return x.startTime.getTime() - y.startTime.getTime();
        });
        nextOrLiveAct = {
          act: upcomingFavsList[0].act,
          status: upcomingFavsList[0].status,
          minutesToStart: upcomingFavsList[0].minutesToStart,
        };
      }

      list.push({
        edition: ed,
        favoritesCount: favs.length,
        clashesCount,
        lastOpenedTime,
        closenessDays,
        nextOrLiveAct,
      });
    });

    // Sort to prioritize: 
    // 1. Festival in progress
    // 2. Festival upcoming closest
    // 3. Last opened
    // 4. Festival with most favorites
    list.sort((x, y) => {
      const xInProg = todayStr >= x.edition.config.startDate && todayStr <= x.edition.config.endDate ? 1 : 0;
      const yInProg = todayStr >= y.edition.config.startDate && todayStr <= y.edition.config.endDate ? 1 : 0;
      if (xInProg !== yInProg) return yInProg - xInProg;

      if (x.lastOpenedTime !== y.lastOpenedTime) return y.lastOpenedTime - x.lastOpenedTime;
      if (x.closenessDays !== y.closenessDays) return x.closenessDays - y.closenessDays;
      return y.favoritesCount - x.favoritesCount;
    });

    return list;
  }, [editions]);

  const primaryAgenda = editionsWithFavs[0];

  const handleContinueClick = () => {
    if (primaryAgenda) {
      const edId = primaryAgenda.edition.config.edicionId;
      // Pre-set in localStorage to load directly to Agenda with favorites
      window.localStorage.setItem(`af_${edId}_open_agenda_favs`, 'true');
      window.localStorage.setItem(`af_${edId}_only_favorites`, 'true');
      onSelectEdition(edId);
    }
  };

  return (
    <section
      style={{
        width: '100%',
        marginBottom: '32px',
        animation: 'fadeIn 0.4s ease-out 0.3s both',
      }}
    >
      <h3
        style={{
          fontSize: '1.25rem',
          fontWeight: '900',
          color: '#ffffff',
          marginBottom: '12px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        {t(language, 'continueMyAgenda')}
      </h3>

      {primaryAgenda ? (
        /* Dynamic Continue Agenda Card */
        <div
          onClick={handleContinueClick}
          className="glass-gradient-border neon-glow btn-interactive"
          style={{
            cursor: 'pointer',
            padding: '20px',
            borderRadius: '16px',
            border: '1px solid rgba(255, 42, 133, 0.4)',
            background: 'linear-gradient(135deg, rgba(255, 42, 133, 0.1) 0%, rgba(15, 17, 24, 0.8) 100%)',
            boxShadow: '0 8px 32px rgba(255, 42, 133, 0.12)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            position: 'relative',
          }}
        >
          {/* Top Row: Title & Chevron */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
            <div>
              <h4 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#ffffff', margin: '0 0 4px 0' }}>
                {primaryAgenda.edition.config.visibleName}
              </h4>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                {tFormat(language, 'conciertosGuardados', { count: primaryAgenda.favoritesCount })}
              </span>
            </div>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'rgba(255, 42, 133, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ArrowRight size={18} color="#ff2a85" />
            </div>
          </div>

          {/* Details Row: Clashes */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.78rem',
                color: primaryAgenda.clashesCount > 0 ? '#ff7a00' : '#00e676',
                background: primaryAgenda.clashesCount > 0 ? 'rgba(255, 122, 0, 0.08)' : 'rgba(0, 230, 118, 0.08)',
                padding: '4px 10px',
                borderRadius: '8px',
                border: primaryAgenda.clashesCount > 0 ? '1px solid rgba(255, 122, 0, 0.2)' : '1px solid rgba(0, 230, 118, 0.2)',
                fontWeight: '700',
              }}
            >
              {primaryAgenda.clashesCount > 0 ? (
                <>
                  <AlertTriangle size={12} />
                  <span>{tFormat(language, 'solapesDetectados', { count: primaryAgenda.clashesCount })}</span>
                </>
              ) : (
                <>
                  <Zap size={12} fill="#00e676" />
                  <span>{t(language, 'sinSolapes')}</span>
                </>
              )}
            </div>
          </div>

          {/* Bottom Row: Next Concert Live Tracker */}
          {primaryAgenda.nextOrLiveAct && (
            <div
              style={{
                paddingTop: '12px',
                borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <div
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: primaryAgenda.nextOrLiveAct.status === 'live' ? '#ff003c' : '#ffd600',
                  boxShadow: `0 0 6px ${primaryAgenda.nextOrLiveAct.status === 'live' ? '#ff003c' : '#ffd600'}`,
                  animation: 'pulseYellow 1.5s infinite ease-in-out',
                }}
              />
              <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                {primaryAgenda.nextOrLiveAct.status === 'live'
                  ? tFormat(language, 'enDirectoHome', { band: primaryAgenda.nextOrLiveAct.act.band })
                  : tFormat(language, 'proximoHome', { band: primaryAgenda.nextOrLiveAct.act.band, time: primaryAgenda.nextOrLiveAct.act.start })}
              </span>
            </div>
          )}
        </div>
      ) : (
        /* Alternative CTA: Create Your Agenda */
        <div
          className="glass"
          style={{
            padding: '20px',
            borderRadius: '16px',
            border: '1px dashed var(--border-color)',
            background: 'rgba(255, 255, 255, 0.01)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            alignItems: 'flex-start',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={18} color="#ffd600" fill="#ffd600" />
            <h4 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#ffffff', margin: 0 }}>
              {t(language, 'createYourAgenda')}
            </h4>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.35 }}>
            {t(language, 'createYourAgendaDesc')}
          </p>
          <button
            onClick={onScrollToMyFestivals}
            style={{
              background: 'var(--accent-red)',
              border: 'none',
              color: '#ffffff',
              fontSize: '0.8rem',
              fontWeight: '800',
              padding: '10px 18px',
              borderRadius: '10px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(255, 42, 133, 0.25)',
            }}
            className="btn-interactive"
          >
            {t(language, 'startNow')}
          </button>
        </div>
      )}
    </section>
  );
};
