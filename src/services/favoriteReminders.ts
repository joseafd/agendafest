import type { Act } from '../data/festivalData';

export const FAVORITE_REMINDER_MINUTES = 15;

export interface FavoriteReminder {
  act: Act;
  startsAt: Date;
}

export const getActStartTime = (act: Act, dayEndHour: number): Date => {
  const datePart = act.id.substring(0, 10);
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = act.start.split(':').map(Number);
  const startsAt = new Date(year, month - 1, day);

  if (hour < dayEndHour) {
    startsAt.setDate(startsAt.getDate() + 1);
  }

  startsAt.setHours(hour, minute, 0, 0);
  return startsAt;
};

export const findDueFavoriteReminders = (
  acts: Act[],
  getStartTime: (act: Act) => Date,
  now: Date,
  sentIds: ReadonlySet<string>,
  leadMinutes = FAVORITE_REMINDER_MINUTES,
): FavoriteReminder[] => {
  const nowMs = now.getTime();
  const leadMs = leadMinutes * 60 * 1000;

  return acts
    .filter((act) => !sentIds.has(act.id))
    .map((act) => ({ act, startsAt: getStartTime(act) }))
    .filter(({ startsAt }) => {
      const remainingMs = startsAt.getTime() - nowMs;
      return remainingMs >= 0 && remainingMs <= leadMs;
    })
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
};
