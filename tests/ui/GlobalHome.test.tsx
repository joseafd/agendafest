import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FestivalEdition } from '../../src/data/festivalData';
import { GlobalHome } from '../../src/components/GlobalHome';
import { editions as baseEditions } from './fixtures';

const makeEdition = (
  id: string,
  name: string,
  startDate: string,
  endDate: string,
): FestivalEdition => ({
  ...baseEditions[0],
  config: {
    ...baseEditions[0].config,
    edicionId: id,
    festivalId: id.replace(/-2026$/, ''),
    festivalName: name,
    visibleName: name,
    startDate,
    endDate,
  },
});

describe('Próximos festivales', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 4, 12, 0, 0));
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('excluye los festivales finalizados del modal Ver todos', async () => {
    const festivalEditions = [
      makeEdition('festival-finalizado-2026', 'Festival finalizado', '2026-07-01', '2026-07-03'),
      makeEdition('festival-en-curso-2026', 'Festival en curso', '2026-08-03', '2026-08-05'),
      makeEdition('festival-proximo-a-2026', 'Festival próximo A', '2026-08-10', '2026-08-11'),
      makeEdition('festival-proximo-b-2026', 'Festival próximo B', '2026-09-10', '2026-09-11'),
    ];

    render(
      <GlobalHome
        editions={festivalEditions}
        onSelectEdition={vi.fn()}
        language="es"
        onChangeLanguage={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Ver todos' }));

    const dialog = screen.getByRole('dialog', { name: 'Próximos festivales' });
    expect(within(dialog).getByText('Festival en curso')).toBeTruthy();
    expect(within(dialog).getByText('Festival próximo A')).toBeTruthy();
    expect(within(dialog).getByText('Festival próximo B')).toBeTruthy();
    expect(within(dialog).queryByText('Festival finalizado')).toBeNull();
  });
});
