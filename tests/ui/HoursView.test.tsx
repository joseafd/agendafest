import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { HoursView } from '../../src/components/HoursView';
import type { Act } from '../../src/data/festivalData';
import { days, stages } from './fixtures';

const nightActs: Act[] = [
  {
    id: '2026-08-01-late',
    band: 'Después de medianoche',
    stage: 'Segundo',
    start: '01:00',
    end: '02:00',
    startMinutes: 660,
    endMinutes: 720,
    duration: 60,
  },
  {
    id: '2026-08-01-before',
    band: 'Antes de medianoche',
    stage: 'Principal',
    start: '23:00',
    end: '00:00',
    startMinutes: 540,
    endMinutes: 600,
    duration: 60,
  },
];

describe('Agenda por horas', () => {
  it('mantiene el orden cronológico cuando el festival continúa pasada la medianoche', () => {
    render(
      <HoursView
        acts={nightActs}
        favorites={[]}
        onToggleFavorite={vi.fn()}
        onSelectAct={vi.fn()}
        currentTimeMinutes={0}
        shouldShowLive={false}
        conflictActIds={new Set()}
        dayStartHour={14}
        editionStages={stages}
        days={days}
      />,
    );

    const before = screen.getByText('Antes de medianoche');
    const after = screen.getByText('Después de medianoche');
    expect(before.compareDocumentPosition(after) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('separa la apertura de la ficha y la acción de favorito', async () => {
    const user = userEvent.setup();
    const onSelectAct = vi.fn();
    const onToggleFavorite = vi.fn();

    render(
      <HoursView
        acts={[nightActs[0]]}
        favorites={[]}
        onToggleFavorite={onToggleFavorite}
        onSelectAct={onSelectAct}
        currentTimeMinutes={0}
        shouldShowLive={false}
        conflictActIds={new Set()}
        dayStartHour={14}
        editionStages={stages}
        days={days}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Añadir a favoritos' }));
    expect(onToggleFavorite).toHaveBeenCalledOnce();
    expect(onSelectAct).not.toHaveBeenCalled();

    await user.click(screen.getByText('Después de medianoche'));
    expect(onSelectAct).toHaveBeenCalledWith(nightActs[0]);
  });

  it('no muestra DIRECTO fuera de las fechas del festival aunque coincida la hora', () => {
    render(
      <HoursView
        acts={[nightActs[0]]}
        favorites={[]}
        onToggleFavorite={vi.fn()}
        onSelectAct={vi.fn()}
        currentTimeMinutes={690}
        shouldShowLive={false}
        conflictActIds={new Set()}
        dayStartHour={14}
        editionStages={stages}
        days={days}
      />,
    );

    expect(screen.queryByText('● DIRECTO')).toBeNull();
  });
});
