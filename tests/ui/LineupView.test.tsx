import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LineupView } from '../../src/components/LineupView';
import { acts, days, stages } from './fixtures';

describe('LINE-UP', () => {
  it('cambia de día, restablece TODOS y muestra únicamente las actuaciones correctas', async () => {
    const user = userEvent.setup();

    function Harness() {
      const [selectedDayId, setSelectedDayId] = useState(days[0].id);
      return (
        <LineupView
          days={days}
          stages={stages}
          selectedDayId={selectedDayId}
          onSelectDay={setSelectedDayId}
          onSelectAct={vi.fn()}
          favorites={[]}
          onToggleFavorite={vi.fn()}
          onBackToHome={vi.fn()}
          festivalName="Festival de prueba"
          language="es"
        />
      );
    }

    render(<Harness />);

    expect(screen.getByText('Alpha')).toBeTruthy();
    expect(screen.getByText('Beta')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Principal' }));
    expect(screen.getByText('Alpha')).toBeTruthy();
    expect(screen.queryByText('Beta')).toBeNull();

    await user.click(screen.getByRole('button', { name: /Domingo/ }));

    expect(screen.queryByText('Alpha')).toBeNull();
    expect(screen.getByText('Gamma')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'TODOS' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('permite abrir una banda y alternar su estado de favorita', async () => {
    const user = userEvent.setup();
    const onSelectAct = vi.fn();

    function Harness() {
      const [favorites, setFavorites] = useState<string[]>([]);
      return (
        <LineupView
          days={days}
          stages={stages}
          selectedDayId={days[0].id}
          onSelectDay={vi.fn()}
          onSelectAct={onSelectAct}
          favorites={favorites}
          onToggleFavorite={(id) => {
            setFavorites((current) => current.includes(id)
              ? current.filter((favoriteId) => favoriteId !== id)
              : [...current, id]);
          }}
          onBackToHome={vi.fn()}
          festivalName="Festival de prueba"
          language="es"
        />
      );
    }

    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'Añadir Alpha a favoritos' }));
    expect(screen.getByRole('button', { name: 'Quitar Alpha de favoritos' })).toBeTruthy();

    await user.click(screen.getByRole('button', { name: /Alpha, 18:00/ }));
    expect(onSelectAct).toHaveBeenCalledWith(acts.alpha);

    fireEvent.error(screen.getByAltText('Alpha'));
    expect(screen.getByAltText('Alpha').getAttribute('src')).toContain('icon.svg');
  });
});
