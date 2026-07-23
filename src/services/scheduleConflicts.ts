import type { Act, FestivalDay } from '../data/festivalData';

export interface ScheduleConflict {
  first: Act;
  second: Act;
  overlapMinutes: number;
}

export const getOverlapMinutes = (first: Act, second: Act): number => (
  Math.max(
    0,
    Math.min(first.endMinutes, second.endMinutes)
      - Math.max(first.startMinutes, second.startMinutes),
  )
);

export const findFavoriteConflicts = (
  days: FestivalDay[],
  favoriteIds: Iterable<string>,
): ScheduleConflict[] => {
  const favorites = new Set(favoriteIds);

  return days.flatMap((day) => {
    const favoriteActs = day.acts
      .filter((act) => favorites.has(act.id))
      .sort((first, second) => first.startMinutes - second.startMinutes);
    const conflicts: ScheduleConflict[] = [];

    for (let firstIndex = 0; firstIndex < favoriteActs.length; firstIndex += 1) {
      for (
        let secondIndex = firstIndex + 1;
        secondIndex < favoriteActs.length;
        secondIndex += 1
      ) {
        const first = favoriteActs[firstIndex];
        const second = favoriteActs[secondIndex];

        if (second.startMinutes >= first.endMinutes) break;

        const overlapMinutes = getOverlapMinutes(first, second);
        if (overlapMinutes > 0) {
          conflicts.push({ first, second, overlapMinutes });
        }
      }
    }

    return conflicts;
  });
};

export const findConflictsForCandidate = (
  days: FestivalDay[],
  candidate: Act,
  favoriteIds: Iterable<string>,
): ScheduleConflict[] => {
  const favorites = new Set(favoriteIds);
  const day = days.find((festivalDay) =>
    festivalDay.acts.some((act) => act.id === candidate.id)
  );

  if (!day) return [];

  return day.acts
    .filter((act) => act.id !== candidate.id && favorites.has(act.id))
    .map((act) => ({
      first: candidate,
      second: act,
      overlapMinutes: getOverlapMinutes(candidate, act),
    }))
    .filter(({ overlapMinutes }) => overlapMinutes > 0)
    .sort((first, second) => first.second.startMinutes - second.second.startMinutes);
};

export const getConflictingActIds = (
  conflicts: ScheduleConflict[],
): Set<string> => new Set(
  conflicts.flatMap(({ first, second }) => [first.id, second.id])
);
