import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FestivalSelector } from '../../src/components/FestivalSelector';
import { editions } from './fixtures';

describe('Selector de festivales', () => {
  it('busca por ubicación y selecciona la edición mostrada', async () => {
    const user = userEvent.setup();
    const onSelectEdition = vi.fn();

    render(
      <FestivalSelector
        editions={editions}
        onSelectEdition={onSelectEdition}
        language="es"
        onChangeLanguage={vi.fn()}
      />,
    );

    await user.type(screen.getByRole('textbox'), 'Gijón');

    expect(screen.getByText('Festival Norte 2026')).toBeTruthy();
    expect(screen.queryByText('Festival Sur 2026')).toBeNull();

    await user.click(screen.getByText('Festival Norte 2026'));
    expect(onSelectEdition).toHaveBeenCalledWith('festival-norte-2026');
  });

  it('cambia el idioma mediante el control visible', async () => {
    const user = userEvent.setup();
    const onChangeLanguage = vi.fn();

    render(
      <FestivalSelector
        editions={editions}
        onSelectEdition={vi.fn()}
        language="es"
        onChangeLanguage={onChangeLanguage}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Cambiar idioma' }));
    expect(onChangeLanguage).toHaveBeenCalledWith('en');
  });
});
