import { afterEach, describe, expect, it, vi } from 'vitest';
import { platform } from '../../src/services/platform';

const originalNotification = Object.getOwnPropertyDescriptor(window, 'Notification');

const setNavigatorProperty = (property: 'share' | 'clipboard', value: unknown) => {
  Object.defineProperty(window.navigator, property, {
    configurable: true,
    value,
  });
};

afterEach(() => {
  Reflect.deleteProperty(window.navigator, 'share');
  Reflect.deleteProperty(window.navigator, 'clipboard');

  if (originalNotification) {
    Object.defineProperty(window, 'Notification', originalNotification);
  } else {
    Reflect.deleteProperty(window, 'Notification');
  }
});

describe('Servicio de plataforma', () => {
  it('usa el diálogo nativo para compartir cuando está disponible', async () => {
    const nativeShare = vi.fn().mockResolvedValue(undefined);
    const writeText = vi.fn().mockResolvedValue(undefined);
    setNavigatorProperty('share', nativeShare);
    setNavigatorProperty('clipboard', { writeText });

    const payload = { title: 'AgendaFest', url: 'https://example.com/festival' };

    await expect(platform.share(payload)).resolves.toBe('shared');
    expect(nativeShare).toHaveBeenCalledWith(payload);
    expect(writeText).not.toHaveBeenCalled();
  });

  it('copia el enlace si el diálogo de compartir no está disponible', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setNavigatorProperty('clipboard', { writeText });

    await expect(platform.share({ url: 'https://example.com/agenda' })).resolves.toBe('copied');
    expect(writeText).toHaveBeenCalledWith('https://example.com/agenda');
  });

  it('respeta la cancelación del usuario y no copia el enlace', async () => {
    const nativeShare = vi.fn().mockRejectedValue(new DOMException('Cancelado', 'AbortError'));
    const writeText = vi.fn().mockResolvedValue(undefined);
    setNavigatorProperty('share', nativeShare);
    setNavigatorProperty('clipboard', { writeText });

    await expect(platform.share({ url: 'https://example.com/agenda' })).resolves.toBe('cancelled');
    expect(writeText).not.toHaveBeenCalled();
  });

  it('rechaza protocolos inseguros en enlaces externos', () => {
    expect(platform.isAllowedExternalUrl('mailto:joseafd@gmail.com')).toBe(true);
    expect(platform.isAllowedExternalUrl('https://agendafest.example')).toBe(true);
    expect(platform.isAllowedExternalUrl('javascript:alert(1)')).toBe(false);
    expect(platform.isAllowedExternalUrl('data:text/html,contenido')).toBe(false);
  });

  it('abre enlaces web externos sin conceder acceso a la ventana de origen', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(window);

    expect(platform.openExternalUrl('https://example.com/artista', 'new-window')).toBe(true);
    expect(open).toHaveBeenCalledWith(
      'https://example.com/artista',
      '_blank',
      'noopener,noreferrer'
    );

    expect(platform.openExternalUrl('javascript:alert(1)', 'new-window')).toBe(false);
    expect(open).toHaveBeenCalledTimes(1);
  });

  it('no solicita permisos de notificación cuando la API no existe', async () => {
    Reflect.deleteProperty(window, 'Notification');

    expect(platform.getNotificationPermission()).toBe('unsupported');
    await expect(platform.requestNotificationPermission()).resolves.toBe('unsupported');
    expect(platform.showNotification('Próximo concierto')).toBe(false);
  });

  it('muestra notificaciones únicamente con permiso concedido', () => {
    const notifications: Array<{ title: string; options?: NotificationOptions }> = [];

    class FakeNotification {
      static permission: NotificationPermission = 'granted';
      static requestPermission = vi.fn().mockResolvedValue('granted');

      constructor(title: string, options?: NotificationOptions) {
        notifications.push({ title, options });
      }
    }

    Object.defineProperty(window, 'Notification', {
      configurable: true,
      value: FakeNotification,
    });

    expect(platform.showNotification('Airbourne en 15 minutos', { body: 'Escenario principal' })).toBe(true);
    expect(notifications).toEqual([{
      title: 'Airbourne en 15 minutos',
      options: { body: 'Escenario principal' },
    }]);
  });
});
