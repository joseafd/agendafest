import { beforeEach, describe, expect, it, vi } from 'vitest';

const nativeNotifications = vi.hoisted(() => ({
  checkPermissions: vi.fn(),
  requestPermissions: vi.fn(),
  getPending: vi.fn(),
  cancel: vi.fn(),
  schedule: vi.fn(),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => true,
  },
}));

vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: nativeNotifications,
}));

import { platform } from '../../src/services/platform';

describe('Notificaciones nativas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    nativeNotifications.checkPermissions.mockResolvedValue({ display: 'prompt' });
    nativeNotifications.requestPermissions.mockResolvedValue({ display: 'granted' });
    nativeNotifications.getPending.mockResolvedValue({ notifications: [] });
    nativeNotifications.cancel.mockResolvedValue(undefined);
    nativeNotifications.schedule.mockResolvedValue({ notifications: [] });
  });

  it('pide el permiso nativo al activar los avisos', async () => {
    expect(platform.isNativeApp()).toBe(true);
    await expect(platform.checkNotificationPermission()).resolves.toBe('default');
    await expect(platform.requestNotificationPermission()).resolves.toBe('granted');
    expect(nativeNotifications.requestPermissions).toHaveBeenCalledOnce();
  });

  it('reemplaza solo los avisos de favoritos gestionados por AgendaFest', async () => {
    nativeNotifications.getPending.mockResolvedValue({
      notifications: [
        {
          id: 17,
          extra: { source: 'agendafest-favorite-reminder' },
        },
        {
          id: 99,
          extra: { source: 'otra-funcion' },
        },
      ],
    });
    const at = new Date('2026-07-30T19:45:00');

    await expect(platform.syncScheduledNotifications([
      {
        id: 23,
        title: 'Airbourne empieza en 15 minutos',
        body: '20:00 · Escenario principal',
        at,
        tag: 'agendafest-festival-airbourne',
      },
    ])).resolves.toBe(true);

    expect(nativeNotifications.cancel).toHaveBeenCalledWith({
      notifications: [{ id: 17 }],
    });
    expect(nativeNotifications.schedule).toHaveBeenCalledWith({
      notifications: [
        expect.objectContaining({
          id: 23,
          title: 'Airbourne empieza en 15 minutos',
          body: '20:00 · Escenario principal',
          schedule: {
            at,
            allowWhileIdle: true,
          },
          extra: {
            source: 'agendafest-favorite-reminder',
            tag: 'agendafest-festival-airbourne',
          },
        }),
      ],
    });
  });
});
