import { useState } from 'react';
import type { NoticiaItem } from '../data/festivalData';
import { edicionConfig } from '../data/festivalData';
import { ArrowLeft, Calendar, Newspaper, X } from 'lucide-react';

interface NewsViewProps {
  noticias: NoticiaItem[];
  onBackToHome: () => void;
}

export function NewsView({ noticias, onBackToHome }: NewsViewProps) {
  const [selectedNews, setSelectedNews] = useState<NoticiaItem | null>(null);

  return (
    <div className="app-container animate-fade-in" style={{ background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          padding: '12px 16px',
          background: 'rgba(13, 15, 20, 0.75)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--border-color)',
          borderTop: 'var(--safe-top) solid transparent',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <button
          onClick={onBackToHome}
          aria-label="Volver al inicio"
          style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            padding: '10px',
            borderRadius: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.2s, transform 0.1s',
          }}
          className="btn-interactive"
          onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.95)'; }}
          onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
        >
          <ArrowLeft size={18} />
        </button>

        <div style={{ textAlign: 'center' }}>
          <h1 className="font-metal neon-text-glow" style={{ fontSize: '1.15rem', lineHeight: 1.1, textTransform: 'uppercase' }}>NOTICIAS {edicionConfig.festival}</h1>
          <span style={{ fontSize: '0.62rem', letterSpacing: '2px', color: 'var(--text-secondary)', fontWeight: 800 }}>ÚLTIMAS NOVEDADES</span>
        </div>

        <div style={{ width: '38px' }} />
      </header>

      {/* Main Content: News Feed */}
      <main style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {noticias.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', gap: '12px', padding: '32px' }}>
            <Newspaper size={48} style={{ opacity: 0.3 }} />
            <p style={{ textAlign: 'center', fontSize: '0.9rem' }}>No hay noticias publicadas en este momento.</p>
          </div>
        ) : (
          noticias.map((item, index) => (
            <div
              key={index}
              onClick={() => setSelectedNews(item)}
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '16px',
                overflow: 'hidden',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                transition: 'transform 0.2s, border-color 0.2s, box-shadow 0.2s',
              }}
              className="news-card btn-interactive"
            >
              {item.imagen && (
                <div style={{ width: '100%', height: '160px', overflow: 'hidden', position: 'relative' }}>
                  <img
                    src={item.imagen}
                    alt={item.entradilla}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: '12px',
                      left: '12px',
                      background: 'rgba(10, 11, 16, 0.8)',
                      backdropFilter: 'blur(4px)',
                      WebkitBackdropFilter: 'blur(4px)',
                      padding: '4px 8px',
                      borderRadius: '8px',
                      fontSize: '0.68rem',
                      fontWeight: '700',
                      color: 'var(--color-primary)',
                      border: '1px solid rgba(255, 42, 133, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Calendar size={10} />
                    {item.fecha}
                  </div>
                </div>
              )}
              
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {!item.imagen && (
                  <div style={{ fontSize: '0.68rem', color: 'var(--color-primary)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                    <Calendar size={10} />
                    {item.fecha}
                  </div>
                )}
                <h2 style={{ fontSize: '1.05rem', fontWeight: '800', color: 'var(--text-primary)', margin: 0, lineHeight: 1.3 }}>
                  {item.entradilla}
                </h2>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-primary)', fontWeight: '700', letterSpacing: '0.5px' }}>Leer más →</span>
                </div>
              </div>
            </div>
          ))
        )}
      </main>

      {/* Detail Modal */}
      {selectedNews && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(8, 9, 13, 0.92)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            zIndex: 150,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '20px',
            animation: 'fadeIn 0.2s ease-out forwards',
          }}
          onClick={() => setSelectedNews(null)}
        >
          <div
            style={{
              background: '#0d0f14',
              border: '1px solid rgba(255, 42, 133, 0.4)',
              borderRadius: '24px',
              maxWidth: '500px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 10px 30px rgba(255, 42, 133, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              animation: 'scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setSelectedNews(null)}
              aria-label="Cerrar noticia"
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: 'rgba(0, 0, 0, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#ffffff',
                padding: '6px',
                borderRadius: '50%',
                cursor: 'pointer',
                zIndex: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
              }}
            >
              <X size={16} />
            </button>

            {selectedNews.imagen && (
              <div style={{ width: '100%', overflow: 'hidden', position: 'relative', borderTopLeftRadius: '24px', borderTopRightRadius: '24px', background: '#000000' }}>
                <img
                  src={selectedNews.imagen}
                  alt={selectedNews.entradilla}
                  style={{ width: '100%', height: 'auto', display: 'block' }}
                />
              </div>
            )}

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-primary)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={12} />
                {selectedNews.fecha}
              </div>

              <h2 style={{ fontSize: '1.25rem', fontWeight: '900', color: '#ffffff', margin: 0, lineHeight: 1.3, letterSpacing: '-0.3px' }}>
                {selectedNews.entradilla}
              </h2>

              <hr style={{ border: 'none', height: '1px', background: 'rgba(255, 255, 255, 0.08)', margin: 0 }} />

              <p
                style={{
                  fontSize: '0.90rem',
                  lineHeight: 1.6,
                  color: 'var(--text-secondary)',
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {selectedNews.noticia}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
