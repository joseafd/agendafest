import { useCallback, useEffect, useState } from 'react';
import { storage } from '../services/storage';

/**
 * Mantiene estado React persistente sin acoplar los componentes al navegador.
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  const [state, setState] = useState<{ key: string; value: T }>(() => ({
    key,
    value: storage.getJson<T>(key, initialValue),
  }));

  // React may reuse the same dashboard instance when the user changes festival.
  // Adjust the state before committing so data from one edition is never written
  // into the storage key of another edition.
  if (state.key !== key) {
    setState({
      key,
      value: storage.getJson<T>(key, initialValue),
    });
  }

  useEffect(() => {
    storage.setJson(state.key, state.value);
  }, [state]);

  const setStoredValue = useCallback((nextValue: T | ((value: T) => T)) => {
    setState((current) => {
      const currentValue = current.key === key
        ? current.value
        : storage.getJson<T>(key, initialValue);
      const value = nextValue instanceof Function
        ? nextValue(currentValue)
        : nextValue;

      return { key, value };
    });
  }, [initialValue, key]);

  return [
    state.key === key ? state.value : storage.getJson<T>(key, initialValue),
    setStoredValue,
  ];
}
