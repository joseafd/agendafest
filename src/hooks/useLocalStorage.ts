import { useState, useEffect } from 'react';
import { storage } from '../services/storage';

/**
 * Mantiene estado React persistente sin acoplar los componentes al navegador.
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  // Initialize state with value from localStorage or fallback to initialValue
  const [storedValue, setStoredValue] = useState<T>(() => {
    return storage.getJson<T>(key, initialValue);
  });

  // Keep localStorage in sync with state changes
  useEffect(() => {
    storage.setJson(key, storedValue);
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}
