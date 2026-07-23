import { AlertTriangle } from 'lucide-react';
import type { Act } from '../data/festivalData';
import type { ScheduleConflict } from '../services/scheduleConflicts';
import type { Language } from '../utils/translations';

interface FavoriteConflictDialogProps {
  candidate: Act;
  conflicts: ScheduleConflict[];
  language: Language;
  onReplace: () => void;
  onKeepAll: () => void;
  onCancel: () => void;
}

const labels = {
  es: {
    title: 'Solape de horarios',
    intro: 'Este concierto coincide con bandas que ya tienes en tu agenda:',
    overlap: 'minutos de solape',
    replace: 'Sustituir las bandas en conflicto',
    keep: 'Mantener todas',
    cancel: 'Cancelar',
  },
  en: {
    title: 'Schedule clash',
    intro: 'This concert overlaps with bands already in your schedule:',
    overlap: 'minutes overlapping',
    replace: 'Replace conflicting bands',
    keep: 'Keep all',
    cancel: 'Cancel',
  },
  fr: {
    title: 'Conflit d’horaires',
    intro: 'Ce concert chevauche des groupes déjà présents dans votre agenda :',
    overlap: 'minutes de chevauchement',
    replace: 'Remplacer les groupes en conflit',
    keep: 'Tout conserver',
    cancel: 'Annuler',
  },
} satisfies Record<Language, Record<string, string>>;

export const FavoriteConflictDialog = ({
  candidate,
  conflicts,
  language,
  onReplace,
  onKeepAll,
  onCancel,
}: FavoriteConflictDialogProps) => {
  const copy = labels[language];

  return (
    <div
      role="presentation"
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1250,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        background: 'rgba(5, 6, 10, 0.82)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="favorite-conflict-title"
        onClick={(event) => event.stopPropagation()}
        className="glass animate-fade-in"
        style={{
          width: 'min(100%, 440px)',
          maxHeight: 'calc(100vh - 40px)',
          overflowY: 'auto',
          border: '1px solid rgba(255, 183, 0, 0.65)',
          borderRadius: '20px',
          padding: '22px',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.65)',
        }}
      >
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <AlertTriangle size={28} color="#ffb700" aria-hidden="true" />
          <div>
            <h2
              id="favorite-conflict-title"
              style={{ margin: 0, fontSize: '1.2rem', color: '#ffffff' }}
            >
              {copy.title}
            </h2>
            <strong style={{ color: 'var(--accent-red)' }}>
              {candidate.band} · {candidate.start}–{candidate.end}
            </strong>
          </div>
        </div>

        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.45 }}>
          {copy.intro}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {conflicts.map(({ second, overlapMinutes }) => (
            <div
              key={second.id}
              style={{
                padding: '12px',
                borderRadius: '12px',
                background: 'rgba(255, 183, 0, 0.08)',
                border: '1px solid rgba(255, 183, 0, 0.22)',
              }}
            >
              <strong style={{ display: 'block', color: '#ffffff' }}>{second.band}</strong>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.86rem' }}>
                {second.start}–{second.end} · {second.stage} · {overlapMinutes} {copy.overlap}
              </span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', marginTop: '20px' }}>
          <button
            type="button"
            onClick={onReplace}
            className="btn-interactive"
            style={{
              border: 0,
              borderRadius: '11px',
              padding: '12px',
              background: 'var(--accent-red)',
              color: '#ffffff',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            {copy.replace}
          </button>
          <button
            type="button"
            onClick={onKeepAll}
            className="btn-interactive"
            style={{
              border: '1px solid rgba(255, 183, 0, 0.45)',
              borderRadius: '11px',
              padding: '11px',
              background: 'rgba(255, 183, 0, 0.08)',
              color: '#ffffff',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {copy.keep}
          </button>
          <button
            type="button"
            onClick={onCancel}
            style={{
              border: 0,
              padding: '9px',
              background: 'transparent',
              color: 'var(--text-secondary)',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {copy.cancel}
          </button>
        </div>
      </div>
    </div>
  );
};
