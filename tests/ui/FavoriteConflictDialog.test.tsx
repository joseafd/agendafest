import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FavoriteConflictDialog } from '../../src/components/FavoriteConflictDialog';
import type { Act } from '../../src/data/festivalData';

const candidate: Act = {
  id: '2026-08-01-beta',
  band: 'Beta',
  stage: 'Segundo',
  start: '18:30',
  end: '19:30',
  startMinutes: 270,
  endMinutes: 330,
  duration: 60,
};

const existing: Act = {
  id: '2026-08-01-alpha',
  band: 'Alpha',
  stage: 'Principal',
  start: '18:00',
  end: '19:00',
  startMinutes: 240,
  endMinutes: 300,
  duration: 60,
};

describe('Resolución de solapes', () => {
  it('explica el conflicto y permite sustituir la favorita anterior', async () => {
    const user = userEvent.setup();
    const onReplace = vi.fn();

    render(
      <FavoriteConflictDialog
        candidate={candidate}
        conflicts={[{ first: candidate, second: existing, overlapMinutes: 30 }]}
        language="es"
        onReplace={onReplace}
        onKeepAll={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByRole('dialog', { name: 'Solape de horarios' })).toBeTruthy();
    expect(screen.getByText('Alpha')).toBeTruthy();
    expect(screen.getByText(/30 minutos de solape/)).toBeTruthy();

    await user.click(screen.getByRole('button', {
      name: 'Sustituir las bandas en conflicto',
    }));
    expect(onReplace).toHaveBeenCalledOnce();
  });

  it('permite mantener ambos conciertos o cancelar la operación', async () => {
    const user = userEvent.setup();
    const onKeepAll = vi.fn();
    const onCancel = vi.fn();

    render(
      <FavoriteConflictDialog
        candidate={candidate}
        conflicts={[{ first: candidate, second: existing, overlapMinutes: 30 }]}
        language="es"
        onReplace={vi.fn()}
        onKeepAll={onKeepAll}
        onCancel={onCancel}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Mantener todas' }));
    expect(onKeepAll).toHaveBeenCalledOnce();

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
