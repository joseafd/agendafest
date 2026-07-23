export interface SharePayload {
  title?: string;
  text?: string;
  url?: string;
}

export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'unavailable';
export type PlatformNotificationPermission = NotificationPermission | 'unsupported';
export type ExternalUrlTarget = 'same-window' | 'new-window';

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
  return getNotificationApi()?.permission ?? 'unsupported';
};

const requestNotificationPermission = async (): Promise<PlatformNotificationPermission> => {
  const notificationApi = getNotificationApi();
  if (!notificationApi) return 'unsupported';

  try {
    return await notificationApi.requestPermission();
  } catch {
    return notificationApi.permission;
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
  getNotificationPermission,
  requestNotificationPermission,
  showNotification,
};

export type PlatformService = typeof platform;
