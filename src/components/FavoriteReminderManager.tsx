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

const getReminderTitle = (band: string, language: Language): string => (
  language === 'en'
    ? `${band} starts in 15 minutes`
    : language === 'fr'
      ? `${band} commence dans 15 minutes`
      : `${band} empieza en 15 minutos`
);

const getNativeNotificationId = (value: string): number => {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0) & 0x7fffffff;
};

export const FavoriteReminderManager = ({
  editions,
  language,
}: FavoriteReminderManagerProps) => {
  useEffect(() => {
    let cancelled = false;
    let lastNativeSchedule = '';

    const syncNativeReminders = async () => {
      const enabled = storage.getJson<boolean>('af_favorite_reminders_enabled', false) === true;
      const permission = await platform.checkNotificationPermission();

      if (!enabled || permission !== 'granted') {
        if (lastNativeSchedule !== 'disabled') {
          const synced = await platform.syncScheduledNotifications([]);
          if (synced) lastNativeSchedule = 'disabled';
        }
        return;
      }

      const now = new Date();
      const notifications = editions.flatMap((edition) => {
        const editionId = edition.config.edicionId;
        const favorites = new Set(
          storage.getJson<string[]>(`af_${editionId}_favorites`, [])
        );

        return edition.days.flatMap((day) =>
          day.acts
            .filter((act) => favorites.has(act.id))
            .map((act) => {
              const startsAt = getActStartTime(act, edition.config.dayEndHour);
              const notifyAt = new Date(
                startsAt.getTime() - FAVORITE_REMINDER_MINUTES * 60 * 1000
              );

              return {
                id: getNativeNotificationId(`${editionId}:${act.id}`),
                title: getReminderTitle(act.band, language),
                body: `${act.start} · ${act.stage}`,
                at: notifyAt,
                tag: `agendafest-${editionId}-${act.id}`,
              };
            })
            .filter((notification) => notification.at.getTime() > now.getTime())
        );
      });
      const scheduleSignature = JSON.stringify(
        notifications.map(({ id, title, at }) => [id, title, at.toISOString()])
      );

      if (scheduleSignature === lastNativeSchedule || cancelled) return;

      const synced = await platform.syncScheduledNotifications(notifications);
      if (synced) lastNativeSchedule = scheduleSignature;
    };

    const checkWebReminders = async () => {
      if (
        storage.getJson<boolean>('af_favorite_reminders_enabled', false) !== true
        || await platform.checkNotificationPermission() !== 'granted'
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
            getReminderTitle(act.band, language),
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

    const checkReminders = platform.isNativeApp()
      ? syncNativeReminders
      : checkWebReminders;

    void checkReminders();
    const timer = window.setInterval(checkReminders, 30_000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [editions, language]);

  return null;
};
