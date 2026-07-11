import React from 'react';
import { Search } from 'lucide-react';
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
}) => {
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        marginBottom: '24px',
        animation: 'fadeIn 0.4s ease-out 0.1s both',
      }}
    >
      <Search
        size={18}
        style={{
          position: 'absolute',
          left: '14px',
          top: '50%',
          transform: 'translateY(-50%)',
          color: 'var(--text-muted)',
          zIndex: 10,
        }}
      />
      <input
        ref={inputRef}
        type="text"
        placeholder={t(language, 'searchPlaceholderGlobal')}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          padding: '14px 16px 14px 44px',
          background: 'rgba(0, 0, 0, 0.3)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          color: '#ffffff',
          fontSize: '0.95rem',
          outline: 'none',
          boxShadow: '0 4px 15px rgba(0, 0, 0, 0.25)',
          transition: 'border-color 0.2s, box-shadow 0.2s',
        }}
        onFocus={(e) => {
          e.target.style.borderColor = 'var(--accent-red)';
          e.target.style.boxShadow = '0 4px 20px rgba(255, 42, 133, 0.15), 0 0 0 1px rgba(255, 42, 133, 0.3)';
        }}
        onBlur={(e) => {
          e.target.style.borderColor = 'var(--border-color)';
          e.target.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.25)';
        }}
      />
    </div>
  );
};
