import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StagesView } from '../../src/components/StagesView';
import { acts, stages } from './fixtures';

describe('Agenda por escenarios', () => {
  it('oculta la línea horaria y LIVE fuera de las fechas del festival', () => {
    const { container } = render(
      <StagesView
        acts={[acts.alpha]}
        stages={['Principal']}
        favorites={[]}
        onToggleFavorite={vi.fn()}
        onSelectAct={vi.fn()}
        currentTimeMinutes={270}
        shouldShowLive={false}
        conflictActIds={new Set()}
        dayStartHour={14}
        dayEndHour={4}
        editionStages={stages}
      />,
    );

    expect(container.querySelector('#timeline-now-marker')).toBeNull();
    expect(screen.queryByText('● LIVE')).toBeNull();
  });
});
