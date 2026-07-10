import React, { useState, useEffect } from 'react';
import { X, Zap, ArrowUp, ArrowDown, RefreshCw, Eye, EyeOff, ChevronDown, ChevronUp, Globe, Music } from 'lucide-react';
import type { StageConfig } from '../data/festivalData';
import { t } from '../utils/translations';
import type { Language } from '../utils/translations';

interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  // Current values
  onlyFavorites: boolean;
  visibleStages: string[];
  stagesOrder: string[];
  selectedCountries: string[];
  selectedGenres: string[];
  // Options
  allCountries: string[];
  allGenres: string[];
  stagesConfig: StageConfig[];
  // Save callbacks
  onSave: (
    onlyFavorites: boolean,
    visibleStages: string[],
    stagesOrder: string[],
    selectedCountries: string[],
    selectedGenres: string[]
  ) => void;
  defaultStages: string[];
  onClearFavorites?: () => void;
  language: Language;
}

export const FilterDrawer: React.FC<FilterDrawerProps> = ({
  isOpen,
  onClose,
  onlyFavorites: propOnlyFavorites,
  visibleStages: propVisibleStages,
  stagesOrder: propStagesOrder,
  selectedCountries,
  selectedGenres,
  allCountries,
  allGenres,
  stagesConfig,
  onSave,
  defaultStages,
  onClearFavorites,
  language,
}) => {
  // Local state to manage changes before committing on "Guardar"
  const [localOnlyFavorites, setLocalOnlyFavorites] = useState(propOnlyFavorites);
  const [localVisibleStages, setLocalVisibleStages] = useState<string[]>([]);
  const [localStagesOrder, setLocalStagesOrder] = useState<string[]>([]);
  const [localSelectedCountries, setLocalSelectedCountries] = useState<string[]>([]);
  const [localSelectedGenres, setLocalSelectedGenres] = useState<string[]>([]);

  // Collapsible sections state
  const [isCountriesExpanded, setIsCountriesExpanded] = useState(false);
  const [isGenresExpanded, setIsGenresExpanded] = useState(false);

  // Synchronize local state with props when drawer opens
  useEffect(() => {
    if (isOpen) {
      setLocalOnlyFavorites(propOnlyFavorites);
      setLocalVisibleStages([...propVisibleStages]);
      setLocalStagesOrder([...propStagesOrder]);
      setLocalSelectedCountries([...selectedCountries]);
      setLocalSelectedGenres([...selectedGenres]);
    }
  }, [isOpen, propOnlyFavorites, propVisibleStages, propStagesOrder, selectedCountries, selectedGenres]);

  if (!isOpen) return null;

  // Toggle stage visibility
  const handleToggleStageVisibility = (stage: string) => {
    setLocalVisibleStages((prev) =>
      prev.includes(stage) ? prev.filter((s) => s !== stage) : [...prev, stage]
    );
  };

  // Move stage up in the order
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newOrder = [...localStagesOrder];
    const temp = newOrder[index];
    newOrder[index] = newOrder[index - 1];
    newOrder[index - 1] = temp;
    setLocalStagesOrder(newOrder);
  };

  // Move stage down in the order
  const handleMoveDown = (index: number) => {
    if (index === localStagesOrder.length - 1) return;
    const newOrder = [...localStagesOrder];
    const temp = newOrder[index];
    newOrder[index] = newOrder[index + 1];
    newOrder[index + 1] = temp;
    setLocalStagesOrder(newOrder);
  };

  // Reset to default settings
  const handleReset = () => {
    setLocalOnlyFavorites(false);
    setLocalVisibleStages([...defaultStages]);
    setLocalStagesOrder([...defaultStages]);
    setLocalSelectedCountries([]);
    setLocalSelectedGenres([]);
  };

  // Commit changes and close
  const handleSave = () => {
    // Prevent saving if no stages are visible
    if (localVisibleStages.length === 0) {
      alert(language === 'en' 
        ? "You must have at least one stage visible." 
        : language === 'fr' 
          ? "Vous devez avoir au moins une scène visible." 
          : "Debes tener al menos un escenario visible."
      );
      return;
    }
    onSave(localOnlyFavorites, localVisibleStages, localStagesOrder, localSelectedCountries, localSelectedGenres);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        display: 'flex',
        justifyContent: 'flex-end',
        animation: 'fadeIn 0.2s ease-out forwards',
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      {/* Drawer Panel */}
      <div
        style={{
          width: '85%',
          maxWidth: '380px',
          height: '100%',
          background: '#0d0f14',
          borderLeft: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-10px 0 30px rgba(0, 0, 0, 0.5)',
          animation: 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          paddingTop: 'var(--safe-top)',
          paddingBottom: 'var(--safe-bottom)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div
          style={{
            padding: '16px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h2 className="font-metal" style={{ fontSize: '1.1rem', fontWeight: '800', letterSpacing: '0.5px' }}>
            {t(language, 'filterTitle')}
          </h2>
          <button
            onClick={onClose}
            aria-label={t(language, 'closeFilters')}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: 'none',
              color: 'var(--text-secondary)',
              padding: '6px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Drawer Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Favorites Filter Section */}
          <div>
            <h3 style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '800', letterSpacing: '1px', marginBottom: '10px', textTransform: 'uppercase' }}>
              {language === 'en' ? "PREFERENCES" : language === 'fr' ? "PRÉFÉRENCES" : "PREFERENCIAS"}
            </h3>
            
            <div className="switch-container">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Zap size={16} color="var(--accent-red)" fill="var(--accent-red)" />
                <span style={{ fontSize: '0.88rem', fontWeight: '600' }}>{t(language, 'filterFavorites')}</span>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={localOnlyFavorites}
                  onChange={(e) => setLocalOnlyFavorites(e.target.checked)}
                />
                <span className="slider"></span>
              </label>
            </div>

            {onClearFavorites && (
              <button
                onClick={() => {
                  const confirmMsg = language === 'en'
                    ? "Are you sure you want to clear all favorite bands? This action cannot be undone."
                    : language === 'fr'
                      ? "Voulez-vous vraiment effacer tous vos favoris ? Cette action est irréversible."
                      : "¿Seguro que deseas borrar todas las bandas de tus favoritos? Esta acción no se puede deshacer.";
                  if (window.confirm(confirmMsg)) {
                    onClearFavorites();
                    onClose();
                  }
                }}
                style={{
                  marginTop: '14px',
                  width: '100%',
                  background: 'rgba(255, 0, 60, 0.05)',
                  border: '1px solid rgba(255, 0, 60, 0.25)',
                  color: '#ff2a85',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'background 0.2s',
                }}
                className="btn-interactive"
              >
                <RefreshCw size={12} />
                {language === 'en' ? 'Clear all my favorites' : language === 'fr' ? 'Effacer tous mes favoris' : 'Borrar todos mis favoritos'}
              </button>
            )}
          </div>

          {/* Country Filter Section */}
          <div>
            <button
              onClick={() => setIsCountriesExpanded(!isCountriesExpanded)}
              style={{
                width: '100%',
                background: 'none',
                border: 'none',
                color: 'var(--text-primary)',
                padding: '0',
                margin: '0',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Globe size={16} color="var(--text-muted)" />
                <h3 style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '800', letterSpacing: '1px', textTransform: 'uppercase' }}>
                  {t(language, 'filterCountries')} {localSelectedCountries.length > 0 ? `(${localSelectedCountries.length})` : ''}
                </h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {localSelectedCountries.length > 0 && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      setLocalSelectedCountries([]);
                    }}
                    style={{
                      fontSize: '0.7rem',
                      color: 'var(--accent-red)',
                      fontWeight: '700',
                      cursor: 'pointer',
                    }}
                  >
                    {language === 'en' ? "Clear" : language === 'fr' ? "Effacer" : "Limpiar"}
                  </span>
                )}
                {isCountriesExpanded ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
              </div>
            </button>
            
            {isCountriesExpanded && (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px',
                  maxHeight: '150px',
                  overflowY: 'auto',
                  padding: '8px 4px',
                  background: 'rgba(255, 255, 255, 0.01)',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                }}
              >
                {allCountries.map((country) => {
                  const isActive = localSelectedCountries.includes(country);
                  return (
                    <button
                      key={country}
                      onClick={() => {
                        setLocalSelectedCountries((prev) =>
                          prev.includes(country)
                            ? prev.filter((c) => c !== country)
                            : [...prev, country]
                        );
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        background: isActive ? 'rgba(255, 0, 60, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                        border: isActive ? '1px solid var(--accent-red)' : '1px solid var(--border-color)',
                        color: isActive ? '#ffffff' : 'var(--text-secondary)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {country}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Genre Filter Section */}
          <div>
            <button
              onClick={() => setIsGenresExpanded(!isGenresExpanded)}
              style={{
                width: '100%',
                background: 'none',
                border: 'none',
                color: 'var(--text-primary)',
                padding: '0',
                margin: '0',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Music size={16} color="var(--text-muted)" />
                <h3 style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '800', letterSpacing: '1px', textTransform: 'uppercase' }}>
                  {t(language, 'filterGenres')} {localSelectedGenres.length > 0 ? `(${localSelectedGenres.length})` : ''}
                </h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {localSelectedGenres.length > 0 && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      setLocalSelectedGenres([]);
                    }}
                    style={{
                      fontSize: '0.7rem',
                      color: 'var(--accent-red)',
                      fontWeight: '700',
                      cursor: 'pointer',
                    }}
                  >
                    {language === 'en' ? "Clear" : language === 'fr' ? "Effacer" : "Limpiar"}
                  </span>
                )}
                {isGenresExpanded ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
              </div>
            </button>
            
            {isGenresExpanded && (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px',
                  maxHeight: '150px',
                  overflowY: 'auto',
                  padding: '8px 4px',
                  background: 'rgba(255, 255, 255, 0.01)',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                }}
              >
                {allGenres.map((genre) => {
                  const isActive = localSelectedGenres.includes(genre);
                  return (
                    <button
                      key={genre}
                      onClick={() => {
                        setLocalSelectedGenres((prev) =>
                          prev.includes(genre)
                            ? prev.filter((g) => g !== genre)
                            : [...prev, genre]
                        );
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        background: isActive ? 'rgba(255, 0, 60, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                        border: isActive ? '1px solid var(--accent-red)' : '1px solid var(--border-color)',
                        color: isActive ? '#ffffff' : 'var(--text-secondary)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {genre}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Stages Configuration Section (Visibility & Reordering) */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <h3 style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '800', letterSpacing: '1px', textTransform: 'uppercase' }}>
                {t(language, 'filterStages')}
              </h3>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                {language === 'en' ? 'Use arrows to sort' : language === 'fr' ? 'Utiliser les flèches pour trier' : 'Usa las flechas para ordenar'}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {localStagesOrder.map((stage, idx) => {
                const isVisible = localVisibleStages.includes(stage);
                const stageObj = stagesConfig.find(s => s.name === stage);
                const stageColor = stageObj ? stageObj.color : '#ffffff';

                return (
                  <div
                    key={stage}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      background: isVisible ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.01)',
                      border: `1px solid ${isVisible ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.02)'}`,
                      borderRadius: '12px',
                      opacity: isVisible ? 1 : 0.6,
                      transition: 'opacity 0.2s',
                    }}
                  >
                    {/* Checkbox / Eye toggle */}
                    <button
                      onClick={() => handleToggleStageVisibility(stage)}
                      aria-label={isVisible ? `Ocultar escenario ${stage}` : `Mostrar escenario ${stage}`}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: isVisible ? stageColor : 'var(--text-muted)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '4px',
                      }}
                    >
                      {isVisible ? <Eye size={18} /> : <EyeOff size={18} />}
                    </button>

                    {/* Stage Name */}
                    <span
                      style={{
                        flex: 1,
                        marginLeft: '12px',
                        fontSize: '0.88rem',
                        fontWeight: '700',
                        color: isVisible ? '#fff' : 'var(--text-secondary)',
                      }}
                    >
                      {stage}
                    </span>

                    {/* Reordering Controls */}
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        onClick={() => handleMoveUp(idx)}
                        disabled={idx === 0}
                        aria-label={`Mover ${stage} hacia arriba`}
                        style={{
                          background: 'rgba(255,255,255,0.03)',
                          border: 'none',
                          color: idx === 0 ? 'var(--text-muted)' : 'var(--text-secondary)',
                          padding: '6px',
                          borderRadius: '6px',
                          cursor: idx === 0 ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: idx === 0 ? 0.3 : 1,
                        }}
                      >
                        <ArrowUp size={12} />
                      </button>
                      <button
                        onClick={() => handleMoveDown(idx)}
                        disabled={idx === localStagesOrder.length - 1}
                        aria-label={`Mover ${stage} hacia abajo`}
                        style={{
                          background: 'rgba(255,255,255,0.03)',
                          border: 'none',
                          color: idx === localStagesOrder.length - 1 ? 'var(--text-muted)' : 'var(--text-secondary)',
                          padding: '6px',
                          borderRadius: '6px',
                          cursor: idx === localStagesOrder.length - 1 ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: idx === localStagesOrder.length - 1 ? 0.3 : 1,
                        }}
                      >
                        <ArrowDown size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Drawer Actions Footer */}
        <div
          style={{
            padding: '16px',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            gap: '12px',
            background: '#0a0b0d',
          }}
        >
          {/* Reset Button */}
          <button
            onClick={handleReset}
            style={{
              flex: 1,
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              borderRadius: '12px',
              padding: '12px',
              fontSize: '0.85rem',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)'; }}
          >
            <RefreshCw size={14} />
            {language === 'en' ? 'Reset' : language === 'fr' ? 'Réinitialiser' : 'Restablecer'}
          </button>

          {/* Save Button */}
          <button
            onClick={handleSave}
            style={{
              flex: 1,
              background: 'var(--accent-red)',
              border: 'none',
              color: '#ffffff',
              borderRadius: '12px',
              padding: '12px',
              fontSize: '0.85rem',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(255, 0, 60, 0.3)',
              transition: 'background-color 0.2s, transform 0.1s',
            }}
            className="btn-interactive"
            onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.96)'; }}
            onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            {language === 'en' ? 'Save' : language === 'fr' ? 'Enregistrer' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
};
