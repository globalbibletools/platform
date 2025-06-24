import { Dispatch, SetStateAction, useEffect, useState } from "react";

export default function useLocalStorageState<T>(item: string): [T | null, Dispatch<SetStateAction<T | null>>] {
  // Fetch the settings from local storage if we're in a browser context
  const getInitialState = (): T | null => {
    if (typeof window === "undefined" || typeof localStorage === "undefined") {
      return null;
    }

    const stored = localStorage.getItem(item);
    if (stored === null) {
      return null;
    }

    return JSON.parse(stored) as T;
  };

  // Persist the settings in localStorage on update
  const [settings, setSettings] = useState<T | null>(getInitialState);
  useEffect(() => {
    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      localStorage.setItem(item, JSON.stringify(settings));
    }
  }, [settings]);

  return [settings, setSettings];
}
