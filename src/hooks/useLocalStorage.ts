import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";

type LocalStorageInit<T> = T | ((saved: Partial<T> | undefined) => T);

export const useLocalStorage = <T>(key: string, defaultValue: T) => {
  const resolvedInitialValue = _resolveInitialValue(key, defaultValue);
  const queryKey = [key, resolvedInitialValue] as const;
  const queryClient = useQueryClient();
  const mounted = __useMounted();

  const { data } = useQuery({
    queryKey,
    queryFn: () => resolvedInitialValue,
    initialData: resolvedInitialValue,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const { mutate: setData } = useMutation({
    mutationFn: async (next: T) => {
      _safeSetItem(key, next);
      return next;
    },
    onSuccess: (next) => {
      queryClient.setQueryData(queryKey, next);
    },
  });

  const value = mounted ? data : defaultValue;

  return [value as T, setData] as const;
};

const _resolveInitialValue = <T>(key: string, init: LocalStorageInit<T>): T => {
  const raw = _safeGetItem<T>(key);
  if (typeof init === "function") {
    return (init as (saved: Partial<T> | undefined) => T)(raw);
  }
  return raw !== undefined ? (raw as T) : init;
};

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

const _safeGetItem = <T>(key: string): Partial<T> | undefined => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : undefined;
  } catch (error: any) {
    console.error(`Error reading localStorage key ${key}`, error);
    return undefined;
  }
};

const __useMounted = () => {
  return useSyncExternalStore(
    () => () => {}, // empty subscribe
    () => true, // client snapshot: always true
    () => false, // server snapshot: always false
  );
};
