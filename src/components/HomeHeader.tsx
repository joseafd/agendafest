import React, { useState } from 'react';
import { Menu, X, HelpCircle, Info, Calendar, Search, Newspaper, Smartphone, Send } from 'lucide-react';
import { t } from '../utils/translations';
import type { Language } from '../utils/translations';

interface HomeHeaderProps {
  language: Language;
  onChangeLanguage: (lang: Language) => void;
  onOpenPwaGuide: () => void;
  onScrollToSection: (sectionId: string) => void;
  onFocusSearch: () => void;
  onOpenQuickAgenda: () => void;
  onOpenLastNews: () => void;
  onOpenCredits: () => void;
}

export const HomeHeader: React.FC<HomeHeaderProps> = ({
  language,
  onChangeLanguage,
  onOpenPwaGuide,
  onScrollToSection,
  onFocusSearch,
  onOpenQuickAgenda,
  onOpenLastNews,
  onOpenCredits,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const cycleLanguage = () => {
    if (language === 'es') onChangeLanguage('en');
    else if (language === 'en') onChangeLanguage('fr');
    else onChangeLanguage('es');
  };

  const handleMenuClick = (action: () => void) => {
    setIsMenuOpen(false);
    action();
  };

  return (
    <header
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        marginBottom: '24px',
        position: 'relative',
        animation: 'fadeIn 0.4s ease-out',
      }}
    >
      {/* Top Bar (Controls + Brand Title) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        {/* Brand Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(255, 42, 133, 0.15)',
              border: '1px solid rgba(255, 42, 133, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 10px rgba(255, 42, 133, 0.3)',
            }}
          >
            <img src="./images/favicon.png" alt="" style={{ width: '18px', height: '18px', objectFit: 'contain' }} />
          </div>
          <span
            className="font-metal"
            style={{
              fontSize: '1.25rem',
              color: '#ffffff',
              letterSpacing: '1px',
              textTransform: 'uppercase',
            }}
          >
            AgendaFest
          </span>
        </div>

        {/* Right Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Language Cycler */}
          <button
            onClick={cycleLanguage}
            title={language === 'es' ? 'Cambiar idioma' : language === 'en' ? 'Change language' : 'Changer de langue'}
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-color)',
              fontSize: '1.15rem',
              cursor: 'pointer',
              padding: '6px 10px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s',
            }}
            className="btn-interactive"
          >
            {language === 'es' ? '🇪🇸' : language === 'en' ? '🇬🇧' : '🇫🇷'}
          </button>

          {/* PWA Install Button */}
          <button
            onClick={onOpenPwaGuide}
            style={{
              background: 'rgba(0, 230, 118, 0.08)',
              border: '1px solid rgba(0, 230, 118, 0.3)',
              color: '#00e676',
              fontSize: '0.78rem',
              fontWeight: '800',
              padding: '8px 12px',
              borderRadius: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 0 10px rgba(0, 230, 118, 0.1)',
              transition: 'background 0.2s',
            }}
            className="btn-interactive"
          >
            <span>{language === 'es' ? 'Instalar app' : language === 'en' ? 'Install app' : 'Installer app'}</span>
          </button>

          {/* Menu Button */}
          <button
            onClick={() => setIsMenuOpen(true)}
            aria-label="Abrir menú"
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-color)',
              color: '#ffffff',
              padding: '8px 10px',
              borderRadius: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s',
            }}
            className="btn-interactive"
          >
            <Menu size={18} />
          </button>
        </div>
      </div>

      {/* Hero Subtitles */}
      <div style={{ marginTop: '4px' }}>
        <h2
          style={{
            fontSize: '1.8rem',
            lineHeight: 1.1,
            fontWeight: '900',
            color: '#ffffff',
            margin: '0 0 6px 0',
            letterSpacing: '-0.5px',
          }}
        >
          {t(language, 'tuRuta')}
        </h2>
        <p
          style={{
            fontSize: '0.9rem',
            color: 'var(--text-secondary)',
            margin: 0,
            lineHeight: 1.35,
          }}
        >
          {t(language, 'tuRutaDesc')}
        </p>
      </div>

      {/* Drawer Overlay Menú (Mobile Side Drawer Modal) */}
      {isMenuOpen && (
        <div
          onClick={() => setIsMenuOpen(false)}
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
            justifyContent: 'flex-end',
            animation: 'fadeIn 0.25s ease-out',
          }}
        >
          {/* Drawer Menu Panel */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '80%',
              maxWidth: '300px',
              height: '100%',
              background: '#0d0f14',
              borderLeft: '1px solid var(--border-color)',
              padding: '24px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
              boxShadow: '-10px 0 30px rgba(0,0,0,0.5)',
              animation: 'slideInLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              overflowY: 'auto',
            }}
          >
            {/* Header Drawer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="font-metal" style={{ fontSize: '1.2rem', color: '#ff2a85' }}>
                {t(language, 'menuTitle')}
              </span>
              <button
                onClick={() => setIsMenuOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Links List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
              {/* Mis Festivales */}
              <button
                onClick={() => handleMenuClick(() => onScrollToSection('my-festivals-section'))}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: 'transparent',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  padding: '12px 10px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                }}
                className="btn-interactive"
              >
                <Calendar size={18} color="#ff2a85" />
                <span>{t(language, 'myFestivals')}</span>
              </button>

              {/* Mi Agenda */}
              <button
                onClick={() => handleMenuClick(onOpenQuickAgenda)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: 'transparent',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  padding: '12px 10px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                }}
                className="btn-interactive"
              >
                <img src="./images/favicon.png" alt="" style={{ width: '18px', height: '18px', objectFit: 'contain' }} />
                <span>{t(language, 'createYourAgenda')}</span>
              </button>

              {/* Buscar */}
              <button
                onClick={() => handleMenuClick(onFocusSearch)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: 'transparent',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  padding: '12px 10px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                }}
                className="btn-interactive"
              >
                <Search size={18} color="var(--text-muted)" />
                <span>{language === 'es' ? 'Buscar' : language === 'en' ? 'Search' : 'Rechercher'}</span>
              </button>

              {/* Noticias */}
              <button
                onClick={() => handleMenuClick(onOpenLastNews)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: 'transparent',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  padding: '12px 10px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                }}
                className="btn-interactive"
              >
                <Newspaper size={18} color="#2b8be3" />
                <span>{language === 'es' ? 'Noticias' : language === 'en' ? 'News' : 'Actualités'}</span>
              </button>

              <hr style={{ border: 'none', borderBottom: '1px solid var(--border-color)', margin: '12px 0' }} />

              {/* Instalar App */}
              <button
                onClick={() => handleMenuClick(onOpenPwaGuide)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: 'transparent',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  padding: '12px 10px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                }}
                className="btn-interactive"
              >
                <Smartphone size={18} color="#00e676" />
                <span>{language === 'es' ? 'Instalar app' : language === 'en' ? 'Install app' : 'Installer app'}</span>
              </button>

              {/* Idioma */}
              <button
                onClick={cycleLanguage}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: 'transparent',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  padding: '12px 10px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                }}
                className="btn-interactive"
              >
                <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>
                  {language === 'es' ? '🇪🇸' : language === 'en' ? '🇬🇧' : '🇫🇷'}
                </span>
                <span>
                  {language === 'es' ? 'Idioma: Español' : language === 'en' ? 'Language: English' : 'Langue: Français'}
                </span>
              </button>

              {/* Ayuda */}
              <button
                onClick={() => handleMenuClick(onOpenPwaGuide)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: 'transparent',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  padding: '12px 10px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                }}
                className="btn-interactive"
              >
                <HelpCircle size={18} color="var(--text-secondary)" />
                <span>{language === 'es' ? 'Ayuda e instalación' : language === 'en' ? 'Help & install' : "Aide & install"}</span>
              </button>

              {/* Sugerencias */}
              <button
                onClick={() => handleMenuClick(() => {
                  window.location.href = 'mailto:joseafd@gmail.com?subject=AgendaFest%20Sugerencia';
                })}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: 'transparent',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  padding: '12px 10px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                }}
                className="btn-interactive"
              >
                <Send size={18} color="#ff2a85" />
                <span>{t(language, 'suggestions')}</span>
              </button>

              {/* Créditos */}
              <button
                onClick={() => handleMenuClick(onOpenCredits)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: 'transparent',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  padding: '12px 10px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                }}
                className="btn-interactive"
              >
                <Info size={18} color="var(--text-muted)" />
                <span>{language === 'es' ? 'Créditos' : language === 'en' ? 'Credits' : 'Crédits'}</span>
              </button>
            </div>

            {/* Footer Drawer */}
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: 'auto' }}>
              AgendaFest © 2026
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
