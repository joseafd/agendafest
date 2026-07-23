const memoryStorage = new Map<string, string>();

const getBrowserStorage = (): Storage | null => {
  if (typeof window === 'undefined') return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

const readRawValue = (key: string): string | null => {
  const browserStorage = getBrowserStorage();

  if (browserStorage) {
    try {
      const browserValue = browserStorage.getItem(key);
      if (browserValue === null) {
        memoryStorage.delete(key);
        return null;
      }

      memoryStorage.set(key, browserValue);
      return browserValue;
    } catch {
      // El respaldo en memoria mantiene la sesión si el navegador bloquea el almacenamiento.
    }
  }

  return memoryStorage.get(key) ?? null;
};

const writeRawValue = (key: string, value: string): void => {
  memoryStorage.set(key, value);

  try {
    getBrowserStorage()?.setItem(key, value);
  } catch {
    // La aplicación continúa operativa con el respaldo en memoria.
  }
};

export const storage = {
  getString(key: string, fallback: string | null = null): string | null {
    return readRawValue(key) ?? fallback;
  },

  setString(key: string, value: string): void {
    writeRawValue(key, value);
  },

  getJson<T>(key: string, fallback: T): T {
    const value = readRawValue(key);
    if (value === null) return fallback;

    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  },

  setJson<T>(key: string, value: T): void {
    try {
      writeRawValue(key, JSON.stringify(value));
    } catch {
      // Un valor no serializable no debe interrumpir la aplicación.
    }
  },

  remove(key: string): void {
    memoryStorage.delete(key);

    try {
      getBrowserStorage()?.removeItem(key);
    } catch {
      // La clave ya se ha retirado del respaldo en memoria.
    }
  },
};

export type StorageService = typeof storage;
