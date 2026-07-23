import { afterEach, describe, expect, it, vi } from 'vitest';
import { storage } from '../../src/services/storage';

describe('Servicio de almacenamiento', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('guarda y recupera texto y objetos JSON', () => {
    storage.setString('texto', 'AgendaFest');
    storage.setJson('preferencias', { idioma: 'es', aviso: 15 });

    expect(storage.getString('texto')).toBe('AgendaFest');
    expect(storage.getJson('preferencias', {})).toEqual({ idioma: 'es', aviso: 15 });
  });

  it('devuelve el valor seguro si encuentra JSON dañado', () => {
    window.localStorage.setItem('json-danado', '{sin-cerrar');

    expect(storage.getJson('json-danado', ['respaldo'])).toEqual(['respaldo']);
  });

  it('mantiene la sesión en memoria si el navegador bloquea localStorage', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Almacenamiento bloqueado', 'SecurityError');
    });
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Almacenamiento bloqueado', 'SecurityError');
    });

    storage.setString('solo-memoria', 'disponible');

    expect(storage.getString('solo-memoria')).toBe('disponible');
    expect(setItem).toHaveBeenCalled();
    expect(getItem).toHaveBeenCalled();
  });

  it('elimina valores del navegador y del respaldo', () => {
    storage.setString('temporal', 'valor');
    storage.remove('temporal');

    expect(storage.getString('temporal')).toBeNull();
  });
});
