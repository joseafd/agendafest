import { Capacitor } from '@capacitor/core';

export interface SharePayload {
  title?: string;
  text?: string;
  url?: string;
}

export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'unavailable';
export type PlatformNotificationPermission = NotificationPermission | 'unsupported';
export type ExternalUrlTarget = 'same-window' | 'new-window';

export interface ScheduledPlatformNotification {
  id: number;
  title: string;
  body: string;
  at: Date;
  tag: string;
}

const NATIVE_NOTIFICATION_SOURCE = 'agendafest-favorite-reminder';

const getBrowserNavigator = (): Navigator | null => {
  if (typeof window === 'undefined') return null;
  return window.navigator;
};

const getNotificationApi = (): typeof Notification | null => {
  if (typeof window === 'undefined' || typeof window.Notification === 'undefined') {
    return null;
  }

  return window.Notification;
};

const isNativeApp = (): boolean => Capacitor.isNativePlatform();

const getNativeNotifications = async () => {
  if (!isNativeApp()) return null;

  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    return LocalNotifications;
  } catch {
    return null;
  }
};

const isAbortError = (error: unknown): boolean => {
  return error instanceof DOMException && error.name === 'AbortError';
};

const copyText = async (text: string): Promise<boolean> => {
  const clipboard = getBrowserNavigator()?.clipboard;
  if (!clipboard?.writeText) return false;

  try {
    await clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

const share = async (payload: SharePayload): Promise<ShareResult> => {
  const browserNavigator = getBrowserNavigator();

  if (browserNavigator?.share) {
    try {
      await browserNavigator.share(payload);
      return 'shared';
    } catch (error) {
      if (isAbortError(error)) return 'cancelled';
    }
  }

  if (payload.url && await copyText(payload.url)) {
    return 'copied';
  }

  return 'unavailable';
};

const isAllowedExternalUrl = (url: string): boolean => {
  try {
    const parsedUrl = new URL(
      url,
      typeof window === 'undefined' ? 'https://agendafest.invalid' : window.location.href
    );

    return ['http:', 'https:', 'mailto:', 'tel:'].includes(parsedUrl.protocol);
  } catch {
    return false;
  }
};

const openExternalUrl = (url: string, target: ExternalUrlTarget = 'same-window'): boolean => {
  if (typeof window === 'undefined' || !isAllowedExternalUrl(url)) return false;

  if (target === 'new-window') {
    return window.open(url, '_blank', 'noopener,noreferrer') !== null;
  }

  window.location.assign(url);
  return true;
};

const getNotificationPermission = (): PlatformNotificationPermission => {
  if (isNativeApp()) return 'default';
  return getNotificationApi()?.permission ?? 'unsupported';
};

const checkNotificationPermission = async (): Promise<PlatformNotificationPermission> => {
  const nativeNotifications = await getNativeNotifications();
  if (nativeNotifications) {
    try {
      const { display } = await nativeNotifications.checkPermissions();
      return display === 'granted' ? 'granted' : display === 'denied' ? 'denied' : 'default';
    } catch {
      return 'default';
    }
  }

  return getNotificationPermission();
};

const requestNotificationPermission = async (): Promise<PlatformNotificationPermission> => {
  const nativeNotifications = await getNativeNotifications();
  if (nativeNotifications) {
    try {
      const { display } = await nativeNotifications.requestPermissions();
      return display === 'granted' ? 'granted' : display === 'denied' ? 'denied' : 'default';
    } catch {
      return 'denied';
    }
  }

  const notificationApi = getNotificationApi();
  if (!notificationApi) return 'unsupported';

  try {
    return await notificationApi.requestPermission();
  } catch {
    return notificationApi.permission;
  }
};

const syncScheduledNotifications = async (
  notifications: ScheduledPlatformNotification[]
): Promise<boolean> => {
  const nativeNotifications = await getNativeNotifications();
  if (!nativeNotifications) return false;

  try {
    const { notifications: pending } = await nativeNotifications.getPending();
    const ownedNotifications = pending.filter(
      (notification) => notification.extra?.source === NATIVE_NOTIFICATION_SOURCE
    );

    if (ownedNotifications.length > 0) {
      await nativeNotifications.cancel({
        notifications: ownedNotifications.map(({ id }) => ({ id })),
      });
    }

    if (notifications.length > 0) {
      await nativeNotifications.schedule({
        notifications: notifications.map((notification) => ({
          id: notification.id,
          title: notification.title,
          body: notification.body,
          schedule: {
            at: notification.at,
            allowWhileIdle: true,
          },
          extra: {
            source: NATIVE_NOTIFICATION_SOURCE,
            tag: notification.tag,
          },
          autoCancel: true,
        })),
      });
    }

    return true;
  } catch {
    return false;
  }
};

const showNotification = async (title: string, options?: NotificationOptions): Promise<boolean> => {
  const notificationApi = getNotificationApi();
  if (!notificationApi || notificationApi.permission !== 'granted') return false;

  const serviceWorker = getBrowserNavigator()?.serviceWorker;
  if (serviceWorker) {
    try {
      const registration = await serviceWorker.ready;
      await registration.showNotification(title, options);
      return true;
    } catch {
      // Algunos navegadores solo admiten el constructor mientras la app está abierta.
    }
  }

  try {
    new notificationApi(title, options);
    return true;
  } catch {
    return false;
  }
};

export const platform = {
  copyText,
  share,
  isAllowedExternalUrl,
  openExternalUrl,
  isNativeApp,
  getNotificationPermission,
  checkNotificationPermission,
  requestNotificationPermission,
  syncScheduledNotifications,
  showNotification,
};

export type PlatformService = typeof platform;
