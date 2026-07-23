import React, { useState } from 'react';
import { Calendar, Search, Map, Newspaper, Smartphone, MoreHorizontal, X, HelpCircle, Info, FileText, Send } from 'lucide-react';
import { QuickAccessCard } from './QuickAccessCard';
import { t } from '../utils/translations';
import type { Language } from '../utils/translations';
import { platform } from '../services/platform';

interface QuickAccessSectionProps {
  language: Language;
  onChangeLanguage: (lang: Language) => void;
  onFocusSearch: () => void;
  onOpenQuickAgenda: () => void;
  onOpenLastMap: () => void;
  onOpenLastNews: () => void;
  onOpenPwaGuide: () => void;
  onOpenCredits: () => void;
}

export const QuickAccessSection: React.FC<QuickAccessSectionProps> = ({
  language,
  onChangeLanguage,
  onFocusSearch,
  onOpenQuickAgenda,
  onOpenLastMap,
  onOpenLastNews,
  onOpenPwaGuide,
  onOpenCredits,
}) => {
  const [isMoreModalOpen, setIsMoreModalOpen] = useState(false);

  const cycleLanguage = () => {
    if (language === 'es') onChangeLanguage('en');
    else if (language === 'en') onChangeLanguage('fr');
    else onChangeLanguage('es');
  };

  return (
    <section
      style={{
        width: '100%',
        marginBottom: '32px',
        animation: 'fadeIn 0.4s ease-out 0.5s both',
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
        {t(language, 'quickAccess')}
      </h3>

      {/* Grid container */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '12px',
          width: '100%',
        }}
      >
        {/* Card 1: Mi Agenda */}
        <QuickAccessCard
          icon={<Calendar size={18} />}
          title={t(language, 'createYourAgenda')}
          description={t(language, 'myAgendaDesc')}
          onClick={onOpenQuickAgenda}
          color="#ff2a85"
        />

        {/* Card 2: Buscar */}
        <QuickAccessCard
          icon={<Search size={18} />}
          title={language === 'es' ? 'Buscar' : language === 'en' ? 'Search' : 'Rechercher'}
          description={t(language, 'searchDesc')}
          onClick={onFocusSearch}
          color="#2b8be3"
        />

        {/* Card 3: Mapa */}
        <QuickAccessCard
          icon={<Map size={18} />}
          title={language === 'es' ? 'Mapa' : language === 'en' ? 'Venue Map' : 'Plan du site'}
          description={t(language, 'mapDesc')}
          onClick={onOpenLastMap}
          color="#e67e22"
        />

        {/* Card 4: Noticias */}
        <QuickAccessCard
          icon={<Newspaper size={18} />}
          title={language === 'es' ? 'Noticias' : language === 'en' ? 'News' : 'Actualités'}
          description={t(language, 'newsDesc')}
          onClick={onOpenLastNews}
          color="#9c1fb8"
        />

        {/* Card 5: Instalar App */}
        <QuickAccessCard
          icon={<Smartphone size={18} />}
          title={language === 'es' ? 'Instalar app' : language === 'en' ? 'Install app' : 'Installer app'}
          description={t(language, 'installDesc')}
          onClick={onOpenPwaGuide}
          color="#00e676"
        />

        {/* Card 6: Más */}
        <QuickAccessCard
          icon={<MoreHorizontal size={18} />}
          title={language === 'es' ? 'Más' : language === 'en' ? 'More' : 'Plus'}
          description={t(language, 'moreDesc')}
          onClick={() => setIsMoreModalOpen(true)}
          color="#94a3b8"
        />
      </div>

      {/* "Más" Options Drawer / Modal overlay */}
      {isMoreModalOpen && (
        <div
          onClick={() => setIsMoreModalOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(10, 11, 16, 0.85)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            animation: 'fadeIn 0.25s ease-out',
          }}
        >
          {/* Neomorphic Panel */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '450px',
              background: '#0d0f14',
              borderTop: '1px solid var(--border-color)',
              borderTopLeftRadius: '24px',
              borderTopRightRadius: '24px',
              padding: '24px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              boxShadow: '0 -10px 30px rgba(0,0,0,0.5)',
              animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h4 style={{ fontSize: '1.25rem', fontWeight: '900', color: '#ffffff', margin: 0 }}>
                {language === 'es' ? 'Ajustes y opciones' : language === 'en' ? 'Settings & options' : 'Options et paramètres'}
              </h4>
              <button
                onClick={() => setIsMoreModalOpen(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-secondary)',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Options List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Idioma Toggle */}
              <button
                onClick={cycleLanguage}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--border-color)',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  color: '#ffffff',
                  fontSize: '0.92rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
                className="btn-interactive"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>
                    {language === 'es' ? '🇪🇸' : language === 'en' ? '🇬🇧' : '🇫🇷'}
                  </span>
                  <span>
                    {language === 'es' ? 'Idioma' : language === 'en' ? 'Language' : 'Langue'}
                  </span>
                </div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {language === 'es' ? 'Español' : language === 'en' ? 'English' : 'Français'}
                </span>
              </button>

              {/* Ayuda */}
              <button
                onClick={() => {
                  setIsMoreModalOpen(false);
                  onOpenPwaGuide();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--border-color)',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  color: '#ffffff',
                  fontSize: '0.92rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
                className="btn-interactive"
              >
                <HelpCircle size={18} color="#00e676" />
                <span>{t(language, 'helpAndInfo')}</span>
              </button>

              {/* Créditos */}
              <button
                onClick={() => {
                  setIsMoreModalOpen(false);
                  onOpenCredits();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--border-color)',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  color: '#ffffff',
                  fontSize: '0.92rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
                className="btn-interactive"
              >
                <Info size={18} color="#2b8be3" />
                <span>{language === 'es' ? 'Créditos' : language === 'en' ? 'Credits' : 'Crédits'}</span>
              </button>

              {/* Información Legal */}
              <button
                onClick={() => {
                  alert(language === 'es' ? 'Aplicación no oficial desarrollada con fines informativos.' : 'Unofficial application developed for informational purposes.');
                  setIsMoreModalOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--border-color)',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  color: '#ffffff',
                  fontSize: '0.92rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
                className="btn-interactive"
              >
                <FileText size={18} color="#94a3b8" />
                <span>{t(language, 'legalInfo')}</span>
              </button>

              {/* Sugerencias */}
              <button
                onClick={() => {
                  platform.openExternalUrl('mailto:joseafd@gmail.com?subject=AgendaFest%20Sugerencia');
                  setIsMoreModalOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--border-color)',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  color: '#ffffff',
                  fontSize: '0.92rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
                className="btn-interactive"
              >
                <Send size={18} color="#ff2a85" />
                <span>{t(language, 'suggestions')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
