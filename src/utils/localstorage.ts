import { Dispatch, SetStateAction, useEffect, useState } from "react";

export default function useLocalStorageState<T extends Record<string, any>>(item: string, defaultValue: T): [T, Dispatch<SetStateAction<T>>] {
  // Fetch the settings from local storage if we're in a browser context
  const getInitialState = (): T => {
    if (typeof window === "undefined" || typeof localStorage === "undefined") {
      return defaultValue;
    }

    let parsed: any = undefined;
    try {
      parsed = JSON.parse(localStorage.getItem(item) ?? '');
    } catch (error: unknown) {
      console.log(`Error parsing local storage for ${item}: ${error}`);
      return defaultValue;
    }

    return { ...defaultValue, ...parsed };
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
