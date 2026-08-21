import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";

export const useLocalStorage = <T>(key: string, defaultValue: T) => {
  // Cache so getSnapshot returns a stable reference when nothing changed
  const cacheRef = useRef<{ raw: string | null; value: T } | undefined>(
    undefined,
  );

  const getSnapshot = useCallback(() => {
    const raw = localStorage.getItem(key);

    if (cacheRef.current && cacheRef.current.raw === raw) {
      return cacheRef.current.value; // same reference, no re-render triggered
    }

    const value = _safeGetItem(key, defaultValue);
    cacheRef.current = { raw, value };
    return value;
  }, [key, defaultValue]);

  const getServerSnapshot = useCallback(() => {
    return defaultValue;
  }, [defaultValue]);

  const subscribe = useCallback(
    (onChange: () => void) => {
      const onStorageEvent = (e: Event) => {
        const customEvent = e as CustomEvent;
        if (customEvent.detail?.key === key) {
          onChange();
        }
      };
      addEventListener("storage", onChange);
      addEventListener("local-storage-change", onStorageEvent as EventListener);
      return () => {
        removeEventListener("storage", onChange);
        removeEventListener(
          "local-storage-change",
          onStorageEvent as EventListener,
        );
      };
    },
    [key],
  );

  const data = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setData = useCallback(
    (value: T) => {
      _safeSetItem(key, value);
      window.dispatchEvent(
        new CustomEvent("local-storage-change", { detail: { key } }),
      );
    },
    [key],
  );

  useEffect(() => {
    const raw = localStorage.getItem(key);
    if (raw === null) return;

    const reconciled = _safeGetItem(key, defaultValue);
    if (raw !== JSON.stringify(reconciled)) {
      if (_safeSetItem(key, reconciled)) {
        window.dispatchEvent(
          new CustomEvent("local-storage-change", { detail: { key } }),
        );
      }
    }
  }, [key]);

  return [data, setData] as const;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const _safeSetItem = <T>(key: string, value: T) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error: any) {
    if (error.name === "QuotaExceededError" || error.code === 22) {
      console.warn(`Local storage quota exceeded for key: ${key}`);
      return false;
    }
    console.error("localStorage error: ", error);
    return false;
  }
};

const _safeGetItem = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    if (!item) return defaultValue;

    const parsed = JSON.parse(item);
    if (isPlainObject(defaultValue) && isPlainObject(parsed)) {
      return { ...defaultValue, ...parsed } as T;
    }
    return parsed;
  } catch (error: any) {
    console.error(`Error reading localStorage key ${key}`, error);
    return defaultValue;
  }
};
