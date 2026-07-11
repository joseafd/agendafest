import React from 'react';

interface QuickAccessCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  color?: string;
}

export const QuickAccessCard: React.FC<QuickAccessCardProps> = ({
  icon,
  title,
  description,
  onClick,
  color = '#ff2a85',
}) => {
  return (
    <button
      onClick={onClick}
      className="glass btn-interactive"
      style={{
        cursor: 'pointer',
        padding: '16px',
        borderRadius: '16px',
        border: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        textAlign: 'left',
        background: 'rgba(255, 255, 255, 0.02)',
        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.15)',
        width: '100%',
        gap: '8px',
        transition: 'transform 0.15s, border-color 0.2s, box-shadow 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
        e.currentTarget.style.boxShadow = `0 4px 20px rgba(0,0,0,0.25), 0 0 10px rgba(255, 255, 255, 0.03)`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-color)';
        e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.15)';
      }}
    >
      {/* Icon Area */}
      <div
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '8px',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: color,
        }}
      >
        {icon}
      </div>

      {/* Info Area */}
      <div>
        <h4
          style={{
            fontSize: '0.92rem',
            fontWeight: '800',
            color: '#ffffff',
            margin: '0 0 2px 0',
          }}
        >
          {title}
        </h4>
        <p
          style={{
            fontSize: '0.74rem',
            color: 'var(--text-secondary)',
            margin: 0,
            lineHeight: 1.25,
          }}
        >
          {description}
        </p>
      </div>
    </button>
  );
};
