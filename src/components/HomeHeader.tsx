import React, { useState } from 'react';
import {
  Calendar,
  Info,
  Menu,
  Newspaper,
  Search,
  Send,
  Share2,
  Smartphone,
  X,
} from 'lucide-react';
import { t } from '../utils/translations';
import type { Language } from '../utils/translations';
import { platform } from '../services/platform';

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

interface MenuActionProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

const MenuAction: React.FC<MenuActionProps> = ({ icon, label, onClick }) => (
  <button className="af-drawer-action" onClick={onClick}>
    {icon}
    <span>{label}</span>
  </button>
);

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

  const languageFlag = language === 'es' ? '🇪🇸' : language === 'en' ? '🇬🇧' : '🇫🇷';
  const languageLabel = language === 'es' ? 'Idioma: Español' : language === 'en' ? 'Language: English' : 'Langue : Français';

  return (
    <header className="af-home-header">
      <div className="af-home-topbar">
        <div className="af-brand" aria-label="AgendaFest">
          <img src="./images/favicon.png" alt="" />
          <span>AgendaFest</span>
        </div>

        <div className="af-home-actions">
          <button
            className="af-language-button"
            onClick={cycleLanguage}
            aria-label={language === 'es' ? 'Cambiar idioma' : language === 'en' ? 'Change language' : 'Changer de langue'}
          >
            {languageFlag}
          </button>
          <button className="af-install-button" onClick={onOpenPwaGuide}>
            <Smartphone size={17} />
            <span>{language === 'es' ? 'Instalar' : language === 'en' ? 'Install' : 'Installer'}</span>
          </button>
          <button className="af-icon-button" onClick={() => setIsMenuOpen(true)} aria-label="Abrir menú">
            <Menu size={20} />
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <div className="af-drawer-overlay" onClick={() => setIsMenuOpen(false)}>
          <aside className="af-drawer" onClick={(event) => event.stopPropagation()} aria-label={t(language, 'menuTitle')}>
            <div className="af-drawer-header">
              <div>
                <span className="af-kicker">AGENDAFEST</span>
                <h2>{t(language, 'menuTitle')}</h2>
              </div>
              <button className="af-icon-button" onClick={() => setIsMenuOpen(false)} aria-label="Cerrar menú">
                <X size={20} />
              </button>
            </div>

            <div className="af-drawer-actions">
              <MenuAction
                icon={<Calendar size={19} />}
                label={t(language, 'myFestivals')}
                onClick={() => handleMenuClick(() => onScrollToSection('my-festivals-section'))}
              />
              <MenuAction
                icon={<img className="af-menu-bolt" src="./images/favicon.png" alt="" />}
                label={t(language, 'createYourAgenda')}
                onClick={() => handleMenuClick(onOpenQuickAgenda)}
              />
              <MenuAction
                icon={<Search size={19} />}
                label={language === 'es' ? 'Buscar' : language === 'en' ? 'Search' : 'Rechercher'}
                onClick={() => handleMenuClick(onFocusSearch)}
              />
              <MenuAction
                icon={<Newspaper size={19} />}
                label={language === 'es' ? 'Noticias' : language === 'en' ? 'News' : 'Actualités'}
                onClick={() => handleMenuClick(onOpenLastNews)}
              />

              <div className="af-drawer-separator" />

              <MenuAction
                icon={<Smartphone size={19} />}
                label={language === 'es' ? 'Instalar app' : language === 'en' ? 'Install app' : 'Installer l’app'}
                onClick={() => handleMenuClick(onOpenPwaGuide)}
              />
              <MenuAction
                icon={<Share2 size={19} />}
                label={language === 'es' ? 'Compartir' : language === 'en' ? 'Share' : 'Partager'}
                onClick={() => handleMenuClick(() => {
                  void platform.share({
                    title: 'AgendaFest',
                    text: language === 'es'
                      ? 'Monta tu agenda de festivales de rock y metal con AgendaFest'
                      : language === 'en'
                        ? 'Build your rock & metal festival schedule with AgendaFest'
                        : 'Créez votre agenda de festivals rock et métal avec AgendaFest',
                    url: window.location.origin + window.location.pathname,
                  });
                })}
              />
              <MenuAction icon={<span className="af-language-icon">{languageFlag}</span>} label={languageLabel} onClick={cycleLanguage} />
              <MenuAction
                icon={<Send size={19} />}
                label={t(language, 'suggestions')}
                onClick={() => handleMenuClick(() => platform.openExternalUrl('mailto:joseafd@gmail.com?subject=AgendaFest%20Sugerencia'))}
              />
              <MenuAction
                icon={<Info size={19} />}
                label={language === 'es' ? 'Créditos' : language === 'en' ? 'Credits' : 'Crédits'}
                onClick={() => handleMenuClick(onOpenCredits)}
              />
            </div>

            <p className="af-drawer-footer">AgendaFest © 2026</p>
          </aside>
        </div>
      )}
    </header>
  );
};
