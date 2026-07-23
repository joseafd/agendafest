import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useLocalStorage } from '../../src/hooks/useLocalStorage';

describe('Persistencia de la agenda personalizada', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('recupera los favoritos después de volver a abrir la aplicación', () => {
    const firstSession = renderHook(() =>
      useLocalStorage<string[]>('af_festival-norte-2026_favorites', [])
    );

    act(() => {
      firstSession.result.current[1](['2026-08-01-alpha']);
    });
    firstSession.unmount();

    const secondSession = renderHook(() =>
      useLocalStorage<string[]>('af_festival-norte-2026_favorites', [])
    );

    expect(secondSession.result.current[0]).toEqual(['2026-08-01-alpha']);
  });

  it('mantiene separadas las agendas cuando se cambia de festival', () => {
    const { result, rerender } = renderHook(
      ({ editionId }) =>
        useLocalStorage<string[]>(`af_${editionId}_favorites`, []),
      { initialProps: { editionId: 'festival-norte-2026' } },
    );

    act(() => {
      result.current[1](['2026-08-01-alpha']);
    });

    rerender({ editionId: 'festival-sur-2026' });
    expect(result.current[0]).toEqual([]);

    act(() => {
      result.current[1](['2026-08-01-beta']);
    });

    rerender({ editionId: 'festival-norte-2026' });
    expect(result.current[0]).toEqual(['2026-08-01-alpha']);
    expect(window.localStorage.getItem('af_festival-sur-2026_favorites')).toBe(
      JSON.stringify(['2026-08-01-beta'])
    );
  });
});
