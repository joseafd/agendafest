import React from 'react';
import { Search, X, Calendar } from 'lucide-react';
import { t } from '../utils/translations';
import type { Language } from '../utils/translations';

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchGlobal: boolean;
  onSearchGlobalToggle: (global: boolean) => void;
  language: Language;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  searchQuery,
  onSearchChange,
  searchGlobal,
  onSearchGlobalToggle,
  language,
}) => {
  return (
    <div
      style={{
        padding: '0 16px 12px 16px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.02)',
        width: '100%',
      }}
    >
      <div className="responsive-content" style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <Search
          size={16}
          color="var(--text-muted)"
          style={{
            position: 'absolute',
            left: '12px',
            pointerEvents: 'none',
          }}
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchGlobal 
            ? (language === 'en' ? "Search band in all days..." : language === 'fr' ? "Rechercher groupe dans tout le festival..." : "Buscar banda en todo el festival...")
            : t(language, 'searchBarPlaceholder')
          }
          style={{
            width: '100%',
            background: '#151722',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            padding: '10px 36px 10px 36px',
            color: 'var(--text-primary)',
            fontSize: '0.98rem',
            outline: 'none',
            transition: 'border-color 0.2s',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(255, 0, 60, 0.3)'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; }}
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            aria-label={language === 'en' ? "Clear search" : language === 'fr' ? "Effacer la recherche" : "Limpiar búsqueda"}
            style={{
              position: 'absolute',
              right: '12px',
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Global vs Local search toggle button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={() => onSearchGlobalToggle(!searchGlobal)}
          style={{
            background: 'none',
            border: 'none',
            color: searchGlobal ? 'var(--accent-red)' : 'var(--text-secondary)',
            fontSize: '0.85rem',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '2px 6px',
            borderRadius: '6px',
            transition: 'color 0.2s',
          }}
        >
          <Calendar size={12} color={searchGlobal ? 'var(--accent-red)' : 'var(--text-muted)'} />
          {searchGlobal 
            ? (language === 'en' ? "Searching in all days" : language === 'fr' ? "Recherche sur tous les jours" : "Buscando en todos los días") 
            : t(language, 'searchGlobalLabel')
          }
        </button>
      </div>
      </div>
    </div>
  );
};
