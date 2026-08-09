import React from 'react';
import { Search, X } from 'lucide-react';
import { t } from '../utils/translations';
import type { Language } from '../utils/translations';

interface GlobalSearchBarProps {
  value: string;
  onChange: (val: string) => void;
  language: Language;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

export const GlobalSearchBar: React.FC<GlobalSearchBarProps> = ({
  value,
  onChange,
  language,
  inputRef,
}) => (
  <div className="af-global-search">
    <Search size={20} aria-hidden="true" />
    <input
      ref={inputRef}
      type="search"
      placeholder={t(language, 'searchPlaceholderGlobal')}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
    {value && (
      <button onClick={() => onChange('')} aria-label={language === 'es' ? 'Limpiar búsqueda' : 'Clear search'}>
        <X size={18} />
      </button>
    )}
  </div>
);
