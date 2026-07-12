import React, { useState } from 'react';
import { X, Smartphone, Laptop, HelpCircle } from 'lucide-react';
import { t, tFormat } from '../utils/translations';
import type { Language } from '../utils/translations';

interface PwaInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  festivalName: string;
  language: Language;
}

type TabType = 'android' | 'ios' | 'desktop';

export const PwaInstallModal: React.FC<PwaInstallModalProps> = ({
  isOpen,
  onClose,
  festivalName,
  language,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('android');
  if (!isOpen) return null;
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(8, 9, 13, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: '16px',
        animation: 'fadeIn 0.25s ease-out',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          background: 'rgba(20, 22, 31, 0.75)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '24px',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.6), 0 0 20px rgba(255, 42, 133, 0.08)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
          animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px 16px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h2 className="font-metal" style={{ fontSize: '1.25rem', color: '#ffffff', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <HelpCircle size={18} color="#ff2a85" /> {t(language, 'modalTitle')}
            </h2>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px', letterSpacing: '0.5px' }}>
              {tFormat(language, 'modalSubtitle', { festival: festivalName })}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: 'var(--text-secondary)',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s, color 0.2s',
            }}
            className="btn-interactive"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Section 1: PWA Install Guide */}
          <div>
            <h3 style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
              {t(language, 'installTitle')}
            </h3>
            
            {/* Tabs Selector */}
            <div
              style={{
                display: 'flex',
                background: 'rgba(0, 0, 0, 0.25)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '12px',
                padding: '3px',
                marginBottom: '16px',
              }}
            >
              <button
                onClick={() => setActiveTab('android')}
                style={{
                  flex: 1,
                  background: activeTab === 'android' ? 'var(--accent-red)' : 'transparent',
                  color: activeTab === 'android' ? '#ffffff' : 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: '9px',
                  padding: '8px 4px',
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'background 0.2s, color 0.2s',
                }}
              >
                <Smartphone size={14} /> Android
              </button>
              <button
                onClick={() => setActiveTab('ios')}
                style={{
                  flex: 1,
                  background: activeTab === 'ios' ? 'var(--accent-red)' : 'transparent',
                  color: activeTab === 'ios' ? '#ffffff' : 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: '9px',
                  padding: '8px 4px',
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'background 0.2s, color 0.2s',
                }}
              >
                <Smartphone size={14} /> iOS (iPhone)
              </button>
              <button
                onClick={() => setActiveTab('desktop')}
                style={{
                  flex: 1,
                  background: activeTab === 'desktop' ? 'var(--accent-red)' : 'transparent',
                  color: activeTab === 'desktop' ? '#ffffff' : 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: '9px',
                  padding: '8px 4px',
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'background 0.2s, color 0.2s',
                }}
              >
                <Laptop size={14} /> {language === 'en' ? 'Desktop' : language === 'fr' ? 'Ordinateur' : 'Ordenador'}
              </button>
            </div>

            {/* Tab Instructions Content */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.04)',
                borderRadius: '16px',
                padding: '16px',
                fontSize: '0.84rem',
                lineHeight: 1.5,
              }}
            >
              {activeTab === 'android' && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <span style={{ background: 'rgba(0, 198, 255, 0.1)', color: '#00c6ff', padding: '4px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800 }}>{t(language, 'recommended')}</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.8rem' }}>{t(language, 'androidBrowser')}</span>
                  </div>
                  <ol style={{ paddingLeft: '20px', margin: 0, display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--text-secondary)' }}>
                    <li>{t(language, 'androidStep1')}</li>
                    <li>{t(language, 'androidStep2')}</li>
                    <li>{t(language, 'androidStep3')}</li>
                    <li>{t(language, 'androidStep4')}</li>
                  </ol>
                </div>
              )}

              {activeTab === 'ios' && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <span style={{ background: 'rgba(255, 214, 0, 0.1)', color: '#ffd600', padding: '4px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800 }}>{t(language, 'required')}</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.8rem' }}>{t(language, 'iosBrowser')}</span>
                  </div>
                  <ol style={{ paddingLeft: '20px', margin: 0, display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--text-secondary)' }}>
                    <li>{t(language, 'iosStep1')}</li>
                    <li>{t(language, 'iosStep2')}</li>
                    <li>{t(language, 'iosStep3')}</li>
                    <li>{t(language, 'iosStep4')}</li>
                  </ol>
                </div>
              )}

              {activeTab === 'desktop' && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <span style={{ background: 'rgba(0, 230, 118, 0.1)', color: '#00e676', padding: '4px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800 }}>{t(language, 'recommended')}</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.8rem' }}>{t(language, 'pcBrowser')}</span>
                  </div>
                  <ol style={{ paddingLeft: '20px', margin: 0, display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--text-secondary)' }}>
                    <li>{t(language, 'pcStep1')}</li>
                    <li>{t(language, 'pcStep2')}</li>
                    <li>{t(language, 'pcStep3')}</li>
                    <li>{t(language, 'pcStep4')}</li>
                  </ol>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
