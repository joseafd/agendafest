import { describe, expect, it } from 'vitest';
import { findDueFavoriteReminders, getActStartTime } from '../../src/services/favoriteReminders';
import { acts } from './fixtures';

describe('Recordatorios de favoritos', () => {
  const startsAt = new Date('2026-08-01T18:00:00');
  const getStartTime = () => startsAt;

  it('detecta una favorita durante los 15 minutos anteriores', () => {
    const due = findDueFavoriteReminders(
      [acts.alpha],
      getStartTime,
      new Date('2026-08-01T17:45:00'),
      new Set(),
    );

    expect(due.map(({ act }) => act.id)).toEqual([acts.alpha.id]);
  });

  it('no avisa antes de tiempo, después del inicio ni dos veces', () => {
    expect(findDueFavoriteReminders(
      [acts.alpha],
      getStartTime,
      new Date('2026-08-01T17:44:59'),
      new Set(),
    )).toEqual([]);

    expect(findDueFavoriteReminders(
      [acts.alpha],
      getStartTime,
      new Date('2026-08-01T18:00:01'),
      new Set(),
    )).toEqual([]);

    expect(findDueFavoriteReminders(
      [acts.alpha],
      getStartTime,
      new Date('2026-08-01T17:50:00'),
      new Set([acts.alpha.id]),
    )).toEqual([]);
  });

  it('sitúa las actuaciones de madrugada en el día natural siguiente', () => {
    const overnightAct = { ...acts.alpha, start: '02:30' };
    expect(getActStartTime(overnightAct, 4).toISOString()).toBe(
      new Date('2026-08-02T02:30:00').toISOString()
    );
  });
});
