import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/App';

vi.mock('../../src/data/festivalData', () => ({
  agendaFestData: {
    'festival-prueba-2026': {
      config: {
        edicionId: 'festival-prueba-2026',
        visibleName: 'Festival de prueba',
      },
      stages: [],
      days: [],
      noticias: [],
    },
  },
}));

vi.mock('../../src/components/GlobalHome', () => ({
  GlobalHome: ({ onSelectEdition }: { onSelectEdition: (id: string) => void }) => (
    <button onClick={() => onSelectEdition('festival-prueba-2026')}>
      Abrir festival de prueba
    </button>
  ),
}));

vi.mock('../../src/components/FestivalDashboard', () => ({
  FestivalDashboard: ({ onBackToSelector }: { onBackToSelector: () => void }) => (
    <div>
      <span>Panel del festival</span>
      <button onClick={onBackToSelector}>Volver a festivales</button>
    </div>
  ),
}));

describe('Carga progresiva de AgendaFest', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState({}, '', '/');
  });

  it('carga la portada y abre el panel del festival bajo demanda', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole('button', { name: 'Abrir festival de prueba' }));
    expect(await screen.findByText('Panel del festival')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Volver a festivales' }));
    expect(await screen.findByRole('button', { name: 'Abrir festival de prueba' })).toBeTruthy();
  });
});
