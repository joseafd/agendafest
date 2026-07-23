import { describe, expect, it } from 'vitest';
import type { Act, FestivalDay } from '../../src/data/festivalData';
import {
  findConflictsForCandidate,
  findFavoriteConflicts,
  getConflictingActIds,
  getOverlapMinutes,
} from '../../src/services/scheduleConflicts';

const createAct = (
  id: string,
  band: string,
  startMinutes: number,
  endMinutes: number,
): Act => ({
  id,
  band,
  stage: band === 'Alpha' ? 'Principal' : 'Segundo',
  start: '18:00',
  end: '19:00',
  startMinutes,
  endMinutes,
  duration: endMinutes - startMinutes,
});

const alpha = createAct('2026-08-01-alpha', 'Alpha', 240, 300);
const beta = createAct('2026-08-01-beta', 'Beta', 270, 330);
const boundary = createAct('2026-08-01-boundary', 'Boundary', 300, 360);
const nextDay = createAct('2026-08-02-next', 'Next Day', 270, 330);

const days: FestivalDay[] = [
  {
    id: '2026-08-01',
    dayNumber: 1,
    dayLabel: 'Sábado 1',
    weekdayEs: 'Sábado',
    doors: '17:00',
    stages: ['Principal', 'Segundo'],
    acts: [alpha, beta, boundary],
  },
  {
    id: '2026-08-02',
    dayNumber: 2,
    dayLabel: 'Domingo 2',
    weekdayEs: 'Domingo',
    doors: '17:00',
    stages: ['Segundo'],
    acts: [nextDay],
  },
];

describe('Motor de solapes', () => {
  it('calcula la duración exacta y no considera solape dos conciertos consecutivos', () => {
    expect(getOverlapMinutes(alpha, beta)).toBe(30);
    expect(getOverlapMinutes(alpha, boundary)).toBe(0);
  });

  it('detecta cada pareja incompatible una sola vez y solo dentro del mismo día', () => {
    const conflicts = findFavoriteConflicts(
      days,
      [alpha.id, beta.id, boundary.id, nextDay.id],
    );

    expect(conflicts).toHaveLength(2);
    expect(conflicts.map(({ first, second }) => [first.band, second.band])).toEqual([
      ['Alpha', 'Beta'],
      ['Beta', 'Boundary'],
    ]);
    expect(getConflictingActIds(conflicts)).toEqual(
      new Set([alpha.id, beta.id, boundary.id])
    );
  });

  it('localiza las favoritas que impedirían añadir una nueva banda', () => {
    const conflicts = findConflictsForCandidate(days, beta, [alpha.id, nextDay.id]);

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].second.id).toBe(alpha.id);
    expect(conflicts[0].overlapMinutes).toBe(30);
  });

  it('detecta correctamente solapes de madrugada usando la jornada del festival', () => {
    const late = createAct('2026-08-01-late', 'Late', 570, 660);
    const afterMidnight = createAct('2026-08-01-after', 'After Midnight', 630, 690);
    const nightDay: FestivalDay = {
      ...days[0],
      acts: [late, afterMidnight],
    };

    const conflicts = findFavoriteConflicts(
      [nightDay],
      [late.id, afterMidnight.id],
    );

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].overlapMinutes).toBe(30);
  });
});
