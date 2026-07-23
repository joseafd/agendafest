import { useEffect } from 'react';
import type { FestivalEdition } from '../data/festivalData';
import {
  FAVORITE_REMINDER_MINUTES,
  findDueFavoriteReminders,
  getActStartTime,
} from '../services/favoriteReminders';
import { platform } from '../services/platform';
import { storage } from '../services/storage';
import type { Language } from '../utils/translations';

interface FavoriteReminderManagerProps {
  editions: FestivalEdition[];
  language: Language;
}

export const FavoriteReminderManager = ({
  editions,
  language,
}: FavoriteReminderManagerProps) => {
  useEffect(() => {
    let cancelled = false;

    const checkReminders = async () => {
      if (
        storage.getJson<boolean>('af_favorite_reminders_enabled', false) !== true
        || platform.getNotificationPermission() !== 'granted'
      ) {
        return;
      }

      for (const edition of editions) {
        if (cancelled) return;

        const editionId = edition.config.edicionId;
        const favorites = new Set(
          storage.getJson<string[]>(`af_${editionId}_favorites`, [])
        );
        if (favorites.size === 0) continue;

        const sentKey = `af_${editionId}_reminders_sent`;
        const sentIds = new Set(storage.getJson<string[]>(sentKey, []));
        const favoriteActs = edition.days.flatMap((day) =>
          day.acts.filter((act) => favorites.has(act.id))
        );
        const dueReminders = findDueFavoriteReminders(
          favoriteActs,
          (act) => getActStartTime(act, edition.config.dayEndHour),
          new Date(),
          sentIds,
          FAVORITE_REMINDER_MINUTES,
        );

        for (const { act } of dueReminders) {
          if (cancelled) return;

          const shown = await platform.showNotification(
            language === 'en'
              ? `${act.band} starts in 15 minutes`
              : language === 'fr'
                ? `${act.band} commence dans 15 minutes`
                : `${act.band} empieza en 15 minutos`,
            {
              body: `${act.start} · ${act.stage}`,
              icon: './icon.svg',
              badge: './favicon.png',
              tag: `agendafest-${editionId}-${act.id}`,
              silent: false,
            }
          );

          if (shown) {
            sentIds.add(act.id);
            storage.setJson(sentKey, [...sentIds]);
          }
        }
      }
    };

    void checkReminders();
    const timer = window.setInterval(checkReminders, 30_000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [editions, language]);

  return null;
};
