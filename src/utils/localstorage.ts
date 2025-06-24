import { Dispatch, SetStateAction, useEffect, useState } from "react";

export default function useLocalStorageState<T extends Record<string, any>>(item: string, defaultValue: T): [T, Dispatch<SetStateAction<T>>] {
  // Fetch the settings from local storage if we're in a browser context
  const getInitialState = (): T => {
    if (typeof window === "undefined" || typeof localStorage === "undefined") {
      return defaultValue;
    }

    const stored: string | null = localStorage.getItem(item);
    if (stored === null) {
      return defaultValue;
    }

    const parsed: any = JSON.parse(stored);
    if (!(typeof parsed === "object" && parsed !== null)) {
      return defaultValue;
    }

    const json: T = {} as T;
    for (const key in defaultValue) {
      json[key] = key in parsed ? parsed[key] : defaultValue[key];
    }

    return json as T;
  };

  // Persist the settings in localStorage on update
  const [settings, setSettings] = useState<T>(getInitialState);
  useEffect(() => {
    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      localStorage.setItem(item, JSON.stringify(settings));
    }
  }, [item, settings]);

  return [settings, setSettings];
}
