import React, { useState } from 'react';
import { X, Smartphone, Laptop, Share2, Copy, Check, ArrowUpRight, HelpCircle } from 'lucide-react';
import { t, tFormat } from '../utils/translations';
import type { Language } from '../utils/translations';

interface PwaInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  festivalName: string;
  year: number;
  language: Language;
}

type TabType = 'android' | 'ios' | 'desktop';

export const PwaInstallModal: React.FC<PwaInstallModalProps> = ({
  isOpen,
  onClose,
  festivalName,
  year,
  language,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('android');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const appUrl = window.location.origin + window.location.pathname;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(appUrl)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
  };

  const handleShareApi = () => {
    if (typeof navigator.share !== 'undefined') {
      navigator.share({
        title: `AgendaFest - ${festivalName}`,
        text: `¡Mira la agenda de conciertos y horarios para el ${festivalName} ${year}!`,
        url: appUrl,
      }).catch(() => {});
    } else {
      handleCopyLink();
    }
  };

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

          {/* Section 2: Share Link */}
          <div>
            <h3 style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
              {t(language, 'shareTitle')}
            </h3>
            
            <div style={{ display: 'flex', gap: '8px' }}>
              <div
                style={{
                  flex: 1,
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  fontSize: '0.78rem',
                  color: 'var(--text-secondary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {appUrl}
              </div>

              <button
                onClick={handleCopyLink}
                style={{
                  background: copied ? 'rgba(0, 230, 118, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                  border: `1px solid ${copied ? '#00e676' : 'rgba(255, 255, 255, 0.08)'}`,
                  color: copied ? '#00e676' : '#ffffff',
                  borderRadius: '12px',
                  padding: '10px 16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  transition: 'all 0.2s',
                }}
                className="btn-interactive"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? t(language, 'copied') : t(language, 'copy')}
              </button>
            </div>

            {/* Native share button if supported */}
            {typeof navigator.share !== 'undefined' && (
              <button
                onClick={handleShareApi}
                style={{
                  width: '100%',
                  marginTop: '8px',
                  background: 'rgba(255, 42, 133, 0.1)',
                  border: '1px solid rgba(255, 42, 133, 0.25)',
                  color: '#ffffff',
                  borderRadius: '12px',
                  padding: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontSize: '0.85rem',
                  fontWeight: '700',
                  transition: 'background 0.2s',
                }}
                className="btn-interactive"
              >
                <Share2 size={14} color="#ff2a85" />
                {t(language, 'shareText')}
              </button>
            )}
          </div>

          {/* Section 3: Credits */}
          <div style={{ marginTop: '4px', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '16px' }}>
            <h3 style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
              {t(language, 'creditsTitle')}
            </h3>
            
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
              {t(language, 'creditsDesc')}
            </p>
                        <div
              style={{
                marginTop: '12px',
                background: 'rgba(255, 255, 255, 0.01)',
                border: '1px solid rgba(255, 255, 255, 0.03)',
                borderRadius: '16px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t(language, 'officialPhoto')}</span>
                <span style={{ fontSize: '0.85rem', color: '#ffffff', fontWeight: 800 }}>Jose Antonio Fernández</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                <a
                  href="https://www.instagram.com/joseantoniofd.photo/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    flex: 1,
                    background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
                    color: '#ffffff',
                    textDecoration: 'none',
                    borderRadius: '8px',
                    padding: '8px',
                    fontSize: '0.75rem',
                    fontWeight: '800',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    boxShadow: '0 2px 6px rgba(220, 39, 67, 0.2)',
                  }}
                  className="btn-interactive"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg> Instagram <ArrowUpRight size={10} />
                </a>

                <a
                  href="https://www.facebook.com/joseantoniofernandezphoto"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    flex: 1,
                    background: '#1877f2',
                    color: '#ffffff',
                    textDecoration: 'none',
                    borderRadius: '8px',
                    padding: '8px',
                    fontSize: '0.75rem',
                    fontWeight: '800',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    boxShadow: '0 2px 6px rgba(24, 119, 242, 0.2)',
                  }}
                  className="btn-interactive"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}><path d="M18 2h-3a5 5 0 0 0 -5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg> Facebook <ArrowUpRight size={10} />
                </a>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
